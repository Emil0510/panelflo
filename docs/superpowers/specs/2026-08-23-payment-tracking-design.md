# Payment Tracking — Design

## Goal

First sub-project of the Finance area. Let users log payments received against a `Deal`, see paid/outstanding balance, and establish the assignment-scoped access rule every later Finance sub-project (Invoicing, Expenses, Reporting) will reuse.

## Current state (verified against source before designing)

- `Role` enum is already `ADMIN | MEMBER`. `session.user.role` is populated on every session via `lib/auth.ts`'s JWT/session callbacks — no schema change needed to read it.
- `requireApiSession()` (`lib/api.ts`) returns `{ userId, workspaceId, role }` and is the standard entry point for every existing API route (`app/api/deals/[id]/route.ts` etc.) — no separate finance-specific auth path needed.
- `Deal.assignedToId` already exists and is nullable. `Deal.value` is the flat manually-entered total; nothing today tracks how much of it has been paid.
- `Activity` has a fixed `ActivityType` enum (`NOTE | TASK_COMPLETED | DEAL_MOVED | BOT_MESSAGE | STOCK_MOVEMENT`), used as the audit trail shown on the contact detail page's Activity card. `STOCK_MOVEMENT` was added the same way this spec adds `PAYMENT_RECEIVED` — a new enum value plus call sites that create the `Activity` row.
- Sidebar nav (`components/sidebar-nav.tsx`) is a flat array of `{ href, label, icon }` under two sections ("Core", "Workspace"). `CreditCard` icon is already used for `/billing` — Finance needs a different icon.
- Money fields elsewhere (`Deal.value`, `Product.unitPrice`, `DealLineItem.unitPriceAtSale`) are all `Decimal @db.Decimal(12, 2)` — Payment follows the same convention.
- Mutating routes that touch money/stock use `db.$transaction` with an explicit `{ timeout, maxWait }` (see `PATCH /api/deals/[id]`) — the overpayment check + payment write need the same atomicity so two concurrent payments can't both pass validation against a stale sum.

## Decisions made during brainstorming (with the user)

1. **Payments attach to a `Deal`**, not directly to a `Contact` — a deal is the thing with a value to pay off.
2. **Access rule:** `ADMIN` sees every payment in the workspace. `MEMBER` sees only payments on deals where `deal.assignedToId === session.userId`. This rule is a **Global Constraint** — every task in the implementation plan that queries `Payment` must apply it via one shared helper, not reimplement the filter.
3. **Payment method is a fixed enum** (`CASH | BANK_TRANSFER | CARD | OTHER`), not free text — filterable, consistent with how Status/Stage are modeled elsewhere.
4. **Overpayment is blocked.** `sum(existing payments for the deal, excluding the payment being edited) + amount` must not exceed `deal.value`. Violating this returns a 400, same error-shape convention as `StockError` in the Sales & Inventory feature.
5. **Full CRUD.** Payments can be edited and deleted after creation, same as Contacts/Deals/Tasks — no append-only ledger semantics.
6. **UI touchpoints**, decided explicitly to keep this sub-project self-contained without bleeding into the later Reporting sub-project:
   - New "Finance" nav item → `/finance` page: the main hub (table + "Log Payment" action).
   - Deal detail page: payment status badge (Paid/Partial/Unpaid) + payments list with edit/delete.
   - Contact detail page: one rollup line ("Total paid: $X across N deals") under the existing Deals card.
   - **Dashboard widgets are explicitly out of scope** — deferred to the Reporting sub-project so the two don't overlap.
7. **Non-goal:** Invoicing, Expenses, and Revenue reporting are separate sub-projects, brainstormed and planned independently after this one ships.

## Schema

```prisma
enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CARD
  OTHER
}

model Payment {
  id          String        @id @default(cuid())
  workspaceId String
  dealId      String
  amount      Decimal       @db.Decimal(12, 2)
  method      PaymentMethod
  paidAt      DateTime      @default(now())
  notes       String?
  createdById String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  deal      Deal      @relation(fields: [dealId], references: [id], onDelete: Cascade)
  createdBy User?     @relation(fields: [createdById], references: [id], onDelete: SetNull)

  @@index([workspaceId])
  @@index([dealId])
}
```

`Deal` and `Workspace` each get a `payments Payment[]` back-relation. `User` gets a `payments Payment[]` back-relation (via `createdBy`, `onDelete: SetNull` — deleting a user must not delete payment history, same pattern as `StockMovement.createdBy`).

`ActivityType` gains one new value: `PAYMENT_RECEIVED`. Reused for create/edit/delete — the `content` string on the `Activity` row distinguishes the action (e.g. `"Payment of $500 logged on deal \"X\""` / `"Payment of $500 updated on deal \"X\""` / `"Payment of $500 removed from deal \"X\""`), matching how `DEAL_MOVED`'s content string already carries the specific detail rather than the enum needing a value per phrasing.

Migration follows the established hand-written, `prisma migrate deploy` pattern (never `migrate dev`, given this database's known pre-existing checksum drift).

## Access rule implementation

One shared helper, `lib/payments.ts`:

```ts
export function scopePaymentsToSession(session: ApiSession) {
  return session.role === "ADMIN"
    ? { workspaceId: session.workspaceId }
    : { workspaceId: session.workspaceId, deal: { assignedToId: session.userId } };
}
```

Every route and server component that lists or reads `Payment` rows spreads this into its `where` clause. A single-payment fetch (`GET /api/payments/[id]`, or the edit/delete handlers) uses `db.payment.findFirst({ where: { id, ...scopePaymentsToSession(session) } })` — a `MEMBER` requesting a payment outside their scope gets the same 404 `findFirst` already returns for a nonexistent id (no separate 403 path, matching how `GET /api/deals/[id]` already 404s on cross-workspace access rather than 403ing).

Creating a payment: the target `dealId` must resolve under the same scope (`db.deal.findFirst({ where: { id: dealId, workspaceId, ...(role !== "ADMIN" ? { assignedToId: userId } : {}) } })`) — a `MEMBER` cannot log a payment against a deal they aren't assigned to, even if they know its id.

## Overpayment validation

Inside the same `$transaction` as the write (mirrors `PATCH /api/deals/[id]`'s `{ timeout: 20000, maxWait: 5000 }` pattern):

```ts
const existingTotal = await tx.payment.aggregate({
  where: { dealId, ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}) },
  _sum: { amount: true },
});
const alreadyPaid = existingTotal._sum.amount ?? 0;
if (Number(alreadyPaid) + amount > Number(deal.value)) {
  throw new PaymentError("Payment would exceed the deal's remaining balance");
}
```

`PaymentError` follows the same pattern as `StockError` in `lib/deals.ts` — a typed error the route catches and turns into `fail(err.message, 400)`.

## API

- `GET /api/payments?dealId=<id>` — list, scoped via `scopePaymentsToSession`; `dealId` optional (omitted = all payments visible to the session, used by the `/finance` hub).
- `POST /api/payments` — body `{ dealId, amount, method, paidAt, notes? }`, validates deal scope + overpayment inside a transaction, writes the `Activity` row.
- `PATCH /api/payments/[id]` — body is a partial of the same shape; re-runs overpayment validation excluding the payment's own prior amount.
- `DELETE /api/payments/[id]` — writes the "removed" `Activity` row.

All four follow the existing `requireApiSession()` → `isErrorResponse()` → `ok()`/`fail()` envelope used by every other route in `app/api/`.

## UI

**Nav** (`components/sidebar-nav.tsx`): add `{ href: "/finance", label: "Finance", icon: DollarSign }` to the "Core" section, after "Stock". `DollarSign` from `lucide-react` (already a dependency) — distinct from `CreditCard`, which stays on Billing.

**`/finance` page** (new, `app/(dashboard)/finance/page.tsx` + a client table component under `components/finance/`): server component fetches payments scoped to the session (with deal + contact names joined in), renders a table (Deal, Contact, Amount, Method, Date, and — admin only — the assigned rep) plus a "Log Payment" button opening a sheet form (deal select, amount, method dropdown, date picker, notes). The deal select's options are themselves scoped the same way (a `MEMBER` can only pick from their own assigned deals). Follows the existing `ContactsTable`/`TaskList` client-component-with-server-fetched-props pattern.

**Deal detail page** (no such page exists yet standalone — deals are viewed via the pipeline kanban and the contact detail page's Deals card; this spec does not add a new deal detail route). Payment status instead surfaces on the **contact detail page's existing Deals card** (`app/(dashboard)/contacts/[id]/page.tsx`): each deal row gets a small badge (Paid/Partial/Unpaid) computed from `sum(payments for that deal)` vs `deal.value`, right next to the existing stage `Badge`.

**Contact detail page**: one rollup line under the Deals card header — "Total paid: $X across N deals" — summed from all payments on that contact's deals (already scoped, since the page itself is fetched under the session).

## Testing

- Unit-level: `scopePaymentsToSession` returns the right `where` shape for both roles.
- API-level: `POST /api/payments` — happy path; overpayment blocked; `MEMBER` cannot pay against an unassigned deal (403/404); `MEMBER` list excludes payments on unassigned deals; `ADMIN` list includes everything.
- `PATCH`/`DELETE` — same scope checks, plus overpayment re-validation excluding the payment's own prior amount on edit.
- UI: manual verification in the dev server — log a payment as a seeded MEMBER user, confirm it doesn't appear for a different MEMBER's session, confirm ADMIN sees both; confirm the Paid/Partial/Unpaid badge and contact rollup update after logging.

## Out of scope (explicitly, for this sub-project)

- Invoicing, Expenses, Revenue reporting — separate sub-projects, each gets its own brainstorm/spec/plan.
- Dashboard widgets for payment/revenue data.
- A standalone deal-detail route (payments surface on the contact page's existing Deals card instead).
- Editing a deal's `value` retroactively reconciling against existing payments (if `value` drops below `sum(payments)`, existing payments are left as-is; this is a data-integrity edge case that can be revisited if it comes up in practice, same YAGNI stance the Sales & Inventory spec took on retroactive line-item edits).
