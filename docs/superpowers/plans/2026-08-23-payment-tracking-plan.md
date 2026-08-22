# Payment Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users log payments received against a Deal, see paid/outstanding balance, with an assignment-scoped access rule (ADMIN sees all, MEMBER sees only their assigned deals' payments).

**Architecture:** New `Payment` model + `PaymentMethod` enum in Prisma, a shared `lib/payments.ts` scoping/validation helper reused by every route and page, standard REST routes under `/api/payments`, and three UI touchpoints: a new `/finance` hub page, a status badge on the contact detail page's Deals card, and a paid-total rollup on that same card.

**Tech Stack:** Next.js 14 App Router, Prisma 6.19 (PostgreSQL/Neon), Zod, next-auth (JWT session), shadcn/ui, sonner (toasts).

**Spec:** `docs/superpowers/specs/2026-08-23-payment-tracking-design.md`

## Global Constraints

- **Access rule (binds every task that touches `Payment`):** `ADMIN` sees every payment/deal in the workspace; `MEMBER` sees only rows where `deal.assignedToId === session.userId`. Every query goes through the shared `scopePaymentsToSession` / `scopeDealsToSession` helpers in `lib/payments.ts` (Task 2) — never reimplement the filter inline.
- **Payment method is a fixed enum:** `CASH | BANK_TRANSFER | CARD | OTHER`. No free text.
- **Overpayment is blocked:** `sum(existing payments for the deal, excluding the payment being edited) + amount` must not exceed `deal.value`. Enforced inside the same DB transaction as the write.
- **Full CRUD.** Payments can be created, edited, and deleted.
- **Money fields are `Decimal @db.Decimal(12, 2)`**, matching `Deal.value` / `Product.unitPrice`. Convert to `Number(...)` before passing across a server-component → client-component prop boundary or into a JSON response — Decimal instances are not serializable across either boundary in this codebase (see `app/(dashboard)/pipeline/page.tsx`'s `value: Number(d.value)` for the established pattern).
- **Migrations are hand-written SQL, applied only with `prisma migrate deploy`.** Never `prisma migrate dev` — this database has pre-existing migration checksum drift that makes its shadow-DB diffing offer a destructive reset.
- **No test framework exists in this repo** (no jest/vitest/playwright config despite `playwright` being an unused devDependency). Verification for every task is: (1) `rm -rf .next && npm run build` must complete with zero errors — this is the only check that reliably catches type errors in this project, plain `tsc --noEmit` has been empirically confirmed unreliable here; (2) for business logic (scoping, overpayment), a throwaway `npx tsx` script against the real dev database, following the existing `scripts/seed.ts` convention; (3) for UI, manual verification against the running dev server using the seeded accounts below.
- **Seeded test accounts** (from `scripts/seed.ts`, already in the dev database): `demo@panelflo.com` / `password123` (ADMIN) has deal **"Acme annual contract"** (value $12,000). `member@panelflo.com` / `password123` (MEMBER) has deal **"Globex pilot"** (value $3,500). Use these two deals for every scoping check below — do not invent new fixtures.
- **No standalone deal-detail route is created.** Payment status surfaces on the contact detail page's existing Deals card, not a new page.
- **Dashboard widgets are out of scope.** Deferred to the later Reporting sub-project.

---

### Task 1: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260823120000_payment_tracking/migration.sql`

**Interfaces:**
- Produces: `Payment` model (fields: `id, workspaceId, dealId, amount, method, paidAt, notes, createdById, createdAt, updatedAt`), `PaymentMethod` enum (`CASH | BANK_TRANSFER | CARD | OTHER`), `ActivityType` enum gains `PAYMENT_RECEIVED`. `Deal`, `Workspace`, `User` each get a `payments Payment[]` back-relation. All later tasks import the generated Prisma types from `@prisma/client`.

- [ ] **Step 1: Add `PAYMENT_RECEIVED` to `ActivityType`**

In `prisma/schema.prisma`, find:

```prisma
enum ActivityType {
  NOTE
  TASK_COMPLETED
  DEAL_MOVED
  BOT_MESSAGE
  STOCK_MOVEMENT
}
```

Replace with:

```prisma
enum ActivityType {
  NOTE
  TASK_COMPLETED
  DEAL_MOVED
  BOT_MESSAGE
  STOCK_MOVEMENT
  PAYMENT_RECEIVED
}
```

- [ ] **Step 2: Add the `PaymentMethod` enum and `Payment` model**

In `prisma/schema.prisma`, immediately after the closing `}` of `model DealLineItem` (the block that ends just before `model BotSession`), insert:

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

- [ ] **Step 3: Add back-relations**

In `model User`, add one line to the relations block (right after `stockMovements StockMovement[]`):

```prisma
  stockMovements StockMovement[]
  payments       Payment[]
```

In `model Workspace`, add one line (right after `stockMovements   StockMovement[]`):

```prisma
  stockMovements   StockMovement[]
  payments         Payment[]
```

In `model Deal`, add one line (right after `lineItems  DealLineItem[]`):

```prisma
  lineItems  DealLineItem[]
  payments   Payment[]
```

- [ ] **Step 4: Write the migration SQL**

Create `prisma/migrations/20260823120000_payment_tracking/migration.sql`:

```sql
-- Extend ActivityType for payment audit-trail entries
ALTER TYPE "ActivityType" ADD VALUE 'PAYMENT_RECEIVED';

-- Create PaymentMethod enum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');

-- Create Payment table
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_workspaceId_idx" ON "Payment"("workspaceId");
CREATE INDEX "Payment_dealId_idx" ON "Payment"("dealId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 5: Apply the migration and regenerate the client**

Run:
```bash
npx prisma migrate deploy
npx prisma generate
```
Expected: `1 migration found... Applying migration 20260823120000_payment_tracking... The following migration(s) have been applied` then `Generated Prisma Client`.

- [ ] **Step 6: Verify**

Run: `rm -rf .next && npm run build`
Expected: build completes with zero type errors (Payment isn't referenced anywhere yet, so this just confirms the schema/client change alone doesn't break anything).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260823120000_payment_tracking
git commit -m "feat(finance): add Payment model and PaymentMethod enum"
```

---

### Task 2: Access-rule and validation helpers

**Files:**
- Create: `lib/payments.ts`
- Create (throwaway verification script, not committed): `scripts/verify-payments-lib.ts`

**Interfaces:**
- Consumes: `ApiSession` type from `lib/api.ts` (`{ userId: string; workspaceId: string; role: "ADMIN" | "MEMBER" }`).
- Produces: `PaymentError` class, `scopePaymentsToSession(session: ApiSession): Prisma.PaymentWhereInput`, `scopeDealsToSession(session: ApiSession): Prisma.DealWhereInput`, `assertNoOverpayment(tx: Prisma.TransactionClient, opts: { dealId: string; dealValue: Prisma.Decimal | number; amount: number; excludePaymentId?: string }): Promise<void>`. Tasks 3, 4, 7, 8 all import from here.

- [ ] **Step 1: Write `lib/payments.ts`**

```ts
import { Prisma } from "@prisma/client";

import type { ApiSession } from "@/lib/api";

export class PaymentError extends Error {}

export function scopePaymentsToSession(session: ApiSession) {
  return session.role === "ADMIN"
    ? { workspaceId: session.workspaceId }
    : { workspaceId: session.workspaceId, deal: { assignedToId: session.userId } };
}

export function scopeDealsToSession(session: ApiSession) {
  return session.role === "ADMIN"
    ? { workspaceId: session.workspaceId }
    : { workspaceId: session.workspaceId, assignedToId: session.userId };
}

/**
 * Must run inside the same transaction as the Payment create/update it
 * guards — reading the current sum and writing the new row have to be
 * atomic, or two concurrent payments could both pass validation against
 * a stale total.
 */
export async function assertNoOverpayment(
  tx: Prisma.TransactionClient,
  opts: {
    dealId: string;
    dealValue: Prisma.Decimal | number;
    amount: number;
    excludePaymentId?: string;
  }
) {
  const existingTotal = await tx.payment.aggregate({
    where: {
      dealId: opts.dealId,
      ...(opts.excludePaymentId ? { id: { not: opts.excludePaymentId } } : {}),
    },
    _sum: { amount: true },
  });
  const alreadyPaid = Number(existingTotal._sum.amount ?? 0);
  if (alreadyPaid + opts.amount > Number(opts.dealValue)) {
    throw new PaymentError("Payment would exceed the deal's remaining balance");
  }
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-payments-lib.ts`:

```ts
/**
 * Throwaway verification for lib/payments.ts — this repo has no test
 * runner. Run: npx tsx scripts/verify-payments-lib.ts
 * Uses the seeded demo workspace (scripts/seed.ts must have been run).
 */
import { PrismaClient } from "@prisma/client";

import { assertNoOverpayment, PaymentError, scopeDealsToSession, scopePaymentsToSession } from "../lib/payments";

const db = new PrismaClient();

async function main() {
  const admin = await db.user.findUniqueOrThrow({ where: { email: "demo@panelflo.com" } });
  const member = await db.user.findUniqueOrThrow({ where: { email: "member@panelflo.com" } });
  const acmeDeal = await db.deal.findFirstOrThrow({ where: { title: "Acme annual contract" } });
  const globexDeal = await db.deal.findFirstOrThrow({ where: { title: "Globex pilot" } });

  const adminSession = { userId: admin.id, workspaceId: admin.workspaceId, role: "ADMIN" as const };
  const memberSession = { userId: member.id, workspaceId: member.workspaceId, role: "MEMBER" as const };

  // scopeDealsToSession: admin sees both, member sees only their own
  const adminDeals = await db.deal.findMany({ where: scopeDealsToSession(adminSession) });
  const memberDeals = await db.deal.findMany({ where: scopeDealsToSession(memberSession) });
  assert(adminDeals.some((d) => d.id === acmeDeal.id), "admin should see Acme deal");
  assert(adminDeals.some((d) => d.id === globexDeal.id), "admin should see Globex deal");
  assert(!memberDeals.some((d) => d.id === acmeDeal.id), "member should NOT see Acme deal");
  assert(memberDeals.some((d) => d.id === globexDeal.id), "member should see their own Globex deal");

  // scopePaymentsToSession + assertNoOverpayment, against a real payment row
  const testPayment = await db.payment.create({
    data: {
      workspaceId: acmeDeal.workspaceId,
      dealId: acmeDeal.id,
      amount: 5000,
      method: "BANK_TRANSFER",
      createdById: admin.id,
    },
  });

  try {
    const adminPayments = await db.payment.findMany({ where: scopePaymentsToSession(adminSession) });
    assert(adminPayments.some((p) => p.id === testPayment.id), "admin should see the Acme payment");

    const memberPayments = await db.payment.findMany({ where: scopePaymentsToSession(memberSession) });
    assert(!memberPayments.some((p) => p.id === testPayment.id), "member should NOT see the Acme payment (not their deal)");

    // Overpayment: Acme deal value is 12000, 5000 already paid — 8000 more should fail, exactly 7000 should pass
    let blocked = false;
    await db.$transaction(async (tx) => {
      try {
        await assertNoOverpayment(tx, { dealId: acmeDeal.id, dealValue: acmeDeal.value, amount: 8000 });
      } catch (err) {
        blocked = err instanceof PaymentError;
      }
    });
    assert(blocked, "8000 more on top of 5000/12000 should be blocked as overpayment");

    let allowed = true;
    await db.$transaction(async (tx) => {
      try {
        await assertNoOverpayment(tx, { dealId: acmeDeal.id, dealValue: acmeDeal.value, amount: 7000 });
      } catch {
        allowed = false;
      }
    });
    assert(allowed, "exactly 7000 more (reaching 12000 total) should be allowed");
  } finally {
    await db.payment.delete({ where: { id: testPayment.id } });
  }

  console.log("PASS: all lib/payments.ts checks passed");
}

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error("FAIL: " + message);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 3: Run it**

Run: `npx tsx scripts/verify-payments-lib.ts`
Expected: `PASS: all lib/payments.ts checks passed`. If it fails, fix `lib/payments.ts` and rerun — do not proceed until it passes.

- [ ] **Step 4: Verify build, delete the throwaway script, commit**

```bash
rm -rf .next && npm run build
rm scripts/verify-payments-lib.ts
git add lib/payments.ts
git commit -m "feat(finance): add payment scoping and overpayment validation helpers"
```

---

### Task 3: API — list and create payments

**Files:**
- Create: `app/api/payments/route.ts`

**Interfaces:**
- Consumes: `requireApiSession`, `ok`, `fail`, `isErrorResponse` from `lib/api.ts`; `scopePaymentsToSession`, `scopeDealsToSession`, `assertNoOverpayment`, `PaymentError` from `lib/payments.ts` (Task 2).
- Produces: `GET /api/payments?dealId=<id?>` (list, scoped, `dealId` optional filter), `POST /api/payments` (create). Task 5's form sheet POSTs here.

- [ ] **Step 1: Write the route**

```ts
import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { assertNoOverpayment, PaymentError, scopeDealsToSession, scopePaymentsToSession } from "@/lib/payments";

const paymentSchema = z.object({
  dealId: z.string(),
  amount: z.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTHER"]),
  paidAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get("dealId");

  const payments = await db.payment.findMany({
    where: {
      ...scopePaymentsToSession(session),
      ...(dealId ? { dealId } : {}),
    },
    include: {
      deal: {
        select: {
          id: true,
          title: true,
          value: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  return ok(payments, { count: payments.length });
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const deal = await db.deal.findFirst({
    where: { id: parsed.data.dealId, ...scopeDealsToSession(session) },
  });
  if (!deal) return fail("Deal not found", 404);

  try {
    const payment = await db.$transaction(
      async (tx) => {
        await assertNoOverpayment(tx, {
          dealId: deal.id,
          dealValue: deal.value,
          amount: parsed.data.amount,
        });

        const created = await tx.payment.create({
          data: {
            workspaceId: session.workspaceId,
            dealId: deal.id,
            amount: parsed.data.amount,
            method: parsed.data.method,
            paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
            notes: parsed.data.notes || null,
            createdById: session.userId,
          },
        });

        await tx.activity.create({
          data: {
            workspaceId: session.workspaceId,
            contactId: deal.contactId,
            type: "PAYMENT_RECEIVED",
            content: `Payment of $${parsed.data.amount.toLocaleString()} logged on deal "${deal.title}"`,
            createdById: session.userId,
          },
        });

        return created;
      },
      { timeout: 20000, maxWait: 5000 }
    );

    return ok(payment);
  } catch (err) {
    if (err instanceof PaymentError) return fail(err.message, 400);
    throw err;
  }
}
```

- [ ] **Step 2: Verify — unauthenticated request is rejected**

Run: `npm run dev &` then, once it's listening:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/payments
```
Expected: `401` (no session cookie sent). Stop the dev server after (`kill %1` or Ctrl-C).

- [ ] **Step 3: Verify build and commit**

```bash
rm -rf .next && npm run build
git add app/api/payments/route.ts
git commit -m "feat(finance): add GET/POST /api/payments"
```

---

### Task 4: API — edit and delete a payment

**Files:**
- Create: `app/api/payments/[id]/route.ts`

**Interfaces:**
- Consumes: same as Task 3.
- Produces: `PATCH /api/payments/[id]`, `DELETE /api/payments/[id]`. Task 6's table row actions call these.

- [ ] **Step 1: Write the route**

```ts
import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { assertNoOverpayment, PaymentError, scopePaymentsToSession } from "@/lib/payments";

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTHER"]).optional(),
  paidAt: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.payment.findFirst({
    where: { id: params.id, ...scopePaymentsToSession(session) },
    include: { deal: true },
  });
  if (!existing) return fail("Payment not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const amount = parsed.data.amount ?? Number(existing.amount);

  try {
    const payment = await db.$transaction(
      async (tx) => {
        await assertNoOverpayment(tx, {
          dealId: existing.dealId,
          dealValue: existing.deal.value,
          amount,
          excludePaymentId: existing.id,
        });

        const updated = await tx.payment.update({
          where: { id: existing.id },
          data: {
            ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
            ...(parsed.data.method !== undefined ? { method: parsed.data.method } : {}),
            ...(parsed.data.paidAt !== undefined ? { paidAt: new Date(parsed.data.paidAt) } : {}),
            ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
          },
        });

        await tx.activity.create({
          data: {
            workspaceId: session.workspaceId,
            contactId: existing.deal.contactId,
            type: "PAYMENT_RECEIVED",
            content: `Payment of $${Number(updated.amount).toLocaleString()} updated on deal "${existing.deal.title}"`,
            createdById: session.userId,
          },
        });

        return updated;
      },
      { timeout: 20000, maxWait: 5000 }
    );

    return ok(payment);
  } catch (err) {
    if (err instanceof PaymentError) return fail(err.message, 400);
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.payment.findFirst({
    where: { id: params.id, ...scopePaymentsToSession(session) },
    include: { deal: true },
  });
  if (!existing) return fail("Payment not found", 404);

  await db.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: existing.id } });
    await tx.activity.create({
      data: {
        workspaceId: session.workspaceId,
        contactId: existing.deal.contactId,
        type: "PAYMENT_RECEIVED",
        content: `Payment of $${Number(existing.amount).toLocaleString()} removed from deal "${existing.deal.title}"`,
        createdById: session.userId,
      },
    });
  });

  return ok({ deleted: true });
}
```

- [ ] **Step 2: Verify build and commit**

```bash
rm -rf .next && npm run build
git add "app/api/payments/[id]/route.ts"
git commit -m "feat(finance): add PATCH/DELETE /api/payments/[id]"
```

(Full create → edit → delete → scoping behavior is exercised end-to-end via the browser in Task 7's verification, once the UI exists to drive these routes.)

---

### Task 5: Payment form sheet (create + edit)

**Files:**
- Create: `components/finance/payment-form-sheet.tsx`

**Interfaces:**
- Consumes: shadcn `Sheet`/`Select`/`Input`/`Label`/`Textarea`/`Button` from `components/ui/*`; `toast` from `sonner`.
- Produces: `FinanceDealOption` type (`{ id: string; title: string; contact: { firstName: string; lastName: string | null } | null }`), `PaymentFormValues` type, `PaymentFormSheet` component with props `{ deals: FinanceDealOption[]; initial?: PaymentFormValues; trigger: React.ReactNode }`. Task 6 imports both the type and the component; Task 7 imports the component.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type FinanceDealOption = {
  id: string;
  title: string;
  contact: { firstName: string; lastName: string | null } | null;
};

export type PaymentFormValues = {
  id?: string;
  dealId: string;
  amount: string;
  method: "CASH" | "BANK_TRANSFER" | "CARD" | "OTHER";
  paidAt: string;
  notes: string;
};

const EMPTY: PaymentFormValues = {
  dealId: "",
  amount: "",
  method: "CASH",
  paidAt: new Date().toISOString().slice(0, 10),
  notes: "",
};

const METHOD_LABELS: Record<PaymentFormValues["method"], string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
};

export function PaymentFormSheet({
  deals,
  initial,
  trigger,
}: {
  deals: FinanceDealOption[];
  initial?: PaymentFormValues;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PaymentFormValues>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PaymentFormValues>(key: K, val: PaymentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function save() {
    const amountNum = Number(values.amount);
    if (!values.dealId) {
      setError("Select a deal");
      return;
    }
    if (!values.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    setError(null);

    const isEdit = Boolean(values.id);
    const res = await fetch(
      isEdit ? `/api/payments/${values.id}` : "/api/payments",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: values.dealId,
          amount: amountNum,
          method: values.method,
          paidAt: values.paidAt,
          notes: values.notes || undefined,
        }),
      }
    );
    setSaving(false);

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to save payment");
      return;
    }
    setOpen(false);
    if (!isEdit) setValues(EMPTY);
    toast.success(isEdit ? "Payment updated" : "Payment logged");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{values.id ? "Edit payment" : "Log payment"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Deal *</Label>
            <Select
              value={values.dealId}
              onValueChange={(v) => set("dealId", v)}
              disabled={Boolean(values.id)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a deal" />
              </SelectTrigger>
              <SelectContent>
                {deals.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title}
                    {d.contact ? ` — ${d.contact.firstName} ${d.contact.lastName ?? ""}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={values.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select
                value={values.method}
                onValueChange={(v) => set("method", v as PaymentFormValues["method"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(METHOD_LABELS) as PaymentFormValues["method"][]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={values.paidAt}
              onChange={(e) => set("paidAt", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Saving…" : values.id ? "Save changes" : "Log payment"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Note: the deal select is disabled in edit mode (`disabled={Boolean(values.id)}`) — moving an existing payment to a different deal is out of scope; delete and re-log instead. This is a deliberate scope-limiting choice, not an oversight.

- [ ] **Step 2: Verify build and commit**

```bash
rm -rf .next && npm run build
git add components/finance/payment-form-sheet.tsx
git commit -m "feat(finance): add payment form sheet"
```

---

### Task 6: Payments table

**Files:**
- Create: `components/finance/payments-table.tsx`

**Interfaces:**
- Consumes: `PaymentFormSheet`, `FinanceDealOption` from Task 5; `EmptyState` from `components/empty-state.tsx`; `Badge`/`Button` from `components/ui/*`; `toast` from `sonner`.
- Produces: `PaymentRow` type, `PaymentsTable` component with props `{ payments: PaymentRow[]; deals: FinanceDealOption[]; showAssignee: boolean }`. Task 7 imports both.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Pencil, Trash2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PaymentFormSheet, type FinanceDealOption } from "@/components/finance/payment-form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type PaymentRow = {
  id: string;
  amount: number;
  method: "CASH" | "BANK_TRANSFER" | "CARD" | "OTHER";
  paidAt: string;
  notes: string | null;
  deal: {
    id: string;
    title: string;
    value: number;
    contact: { id: string; firstName: string; lastName: string | null } | null;
    assignedTo: { id: string; name: string | null } | null;
  };
};

const METHOD_LABELS: Record<PaymentRow["method"], string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
};

export function PaymentsTable({
  payments,
  deals,
  showAssignee,
}: {
  payments: PaymentRow[];
  deals: FinanceDealOption[];
  showAssignee: boolean;
}) {
  const router = useRouter();

  async function remove(p: PaymentRow) {
    if (!confirm(`Delete this $${p.amount.toLocaleString()} payment on "${p.deal.title}"?`)) return;
    const res = await fetch(`/api/payments/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "Delete failed");
      return;
    }
    toast.success("Payment deleted");
    router.refresh();
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={Wallet}
          title="No payments yet"
          description="Log a payment against a deal to start tracking revenue."
        />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-card">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Deal</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Contact</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Method</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
            {showAssignee && (
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Rep</th>
            )}
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="px-3 py-3 font-medium">{p.deal.title}</td>
              <td className="px-3 py-3 text-muted-foreground">
                {p.deal.contact ? `${p.deal.contact.firstName} ${p.deal.contact.lastName ?? ""}` : "—"}
              </td>
              <td className="px-3 py-3">${p.amount.toLocaleString()}</td>
              <td className="px-3 py-3">
                <Badge variant="outline">{METHOD_LABELS[p.method]}</Badge>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {new Date(p.paidAt).toLocaleDateString()}
              </td>
              {showAssignee && (
                <td className="px-3 py-3 text-muted-foreground">
                  {p.deal.assignedTo?.name ?? "Unassigned"}
                </td>
              )}
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  <PaymentFormSheet
                    deals={deals}
                    initial={{
                      id: p.id,
                      dealId: p.deal.id,
                      amount: String(p.amount),
                      method: p.method,
                      paidAt: p.paidAt.slice(0, 10),
                      notes: p.notes ?? "",
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify build and commit**

```bash
rm -rf .next && npm run build
git add components/finance/payments-table.tsx
git commit -m "feat(finance): add payments table"
```

---

### Task 7: Finance hub page + nav entry

**Files:**
- Create: `app/(dashboard)/finance/page.tsx`
- Modify: `components/sidebar-nav.tsx`

**Interfaces:**
- Consumes: `PaymentFormSheet` (Task 5), `PaymentsTable` + `PaymentRow` (Task 6), `scopePaymentsToSession` + `scopeDealsToSession` (Task 2).
- Produces: the `/finance` route, reachable from the sidebar. This is the first task where the full create/edit/delete/scoping flow becomes manually testable end-to-end.

- [ ] **Step 1: Add the nav entry**

In `components/sidebar-nav.tsx`, add `DollarSign` to the `lucide-react` import (it's not already imported — `CreditCard` is used for Billing and must stay there):

```tsx
import {
  Bell,
  CheckSquare,
  Contact,
  CreditCard,
  DollarSign,
  Kanban,
  LayoutDashboard,
  Package,
  Settings,
  Users,
} from "lucide-react";
```

Then in `NAV_SECTIONS`, add a new item to the "Core" section right after Stock:

```tsx
      { href: "/stock",     label: "Stock",     icon: Package },
      { href: "/finance",   label: "Finance",   icon: DollarSign },
```

- [ ] **Step 2: Write the page**

Create `app/(dashboard)/finance/page.tsx`:

```tsx
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { PaymentFormSheet } from "@/components/finance/payment-form-sheet";
import { PaymentsTable } from "@/components/finance/payments-table";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scopeDealsToSession, scopePaymentsToSession } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const apiSession = {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };

  const [payments, deals] = await Promise.all([
    db.payment.findMany({
      where: scopePaymentsToSession(apiSession),
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            value: true,
            contact: { select: { id: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    }),
    db.deal.findMany({
      where: scopeDealsToSession(apiSession),
      select: {
        id: true,
        title: true,
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { lastMovedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Finance</h2>
        <PaymentFormSheet
          deals={deals}
          trigger={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Log Payment
            </Button>
          }
        />
      </div>
      <PaymentsTable
        payments={payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          paidAt: p.paidAt.toISOString(),
          notes: p.notes,
          deal: {
            id: p.deal.id,
            title: p.deal.title,
            value: Number(p.deal.value),
            contact: p.deal.contact,
            assignedTo: p.deal.assignedTo,
          },
        }))}
        deals={deals}
        showAssignee={apiSession.role === "ADMIN"}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `rm -rf .next && npm run build`
Expected: zero errors, `/finance` appears in the route table output.

- [ ] **Step 4: Manual end-to-end verification**

Start the dev server and, in a browser:

1. Log in as `demo@panelflo.com` / `password123` (ADMIN). Open `/finance` from the sidebar — "Finance" nav item is visible and active.
2. Click "Log Payment". Select deal "Acme annual contract", amount `5000`, method Bank Transfer, today's date. Save.
   Expected: sheet closes, toast "Payment logged", row appears in the table showing Acme annual contract / $5,000 / Bank Transfer.
3. Click "Log Payment" again, same deal, amount `8000`. Save.
   Expected: inline error "Payment would exceed the deal's remaining balance" (5000 + 8000 > 12000) — the sheet stays open, no row is added.
4. Edit the first payment (pencil icon), change amount to `6000`. Save.
   Expected: toast "Payment updated", row now shows $6,000.
5. Log out, log in as `member@panelflo.com` / `password123` (MEMBER). Open `/finance`.
   Expected: the Acme payment is **not** visible. The deal dropdown in "Log Payment" contains only "Globex pilot", not "Acme annual contract".
6. As the member, log a payment on "Globex pilot" for `1000`. Save, then delete it (trash icon, confirm the browser dialog).
   Expected: toast "Payment deleted", row disappears.
7. Log back in as `demo@panelflo.com`. Delete the remaining Acme payment (cleanup).
   Expected: table returns to empty state ("No payments yet") if no other payments exist.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/finance/page.tsx" components/sidebar-nav.tsx
git commit -m "feat(finance): add /finance hub page and nav entry"
```

---

### Task 8: Payment status on the contact detail page

**Files:**
- Modify: `app/(dashboard)/contacts/[id]/page.tsx`

**Interfaces:**
- Consumes: `scopePaymentsToSession` from `lib/payments.ts` (Task 2).
- Produces: nothing consumed by later tasks — this is the last task in the plan.

- [ ] **Step 1: Add the payments query and scoped totals**

In `app/(dashboard)/contacts/[id]/page.tsx`, add the import:

```ts
import { scopePaymentsToSession } from "@/lib/payments";
```

Immediately after `if (!contact) notFound();`, insert:

```ts
  const apiSession = {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };

  const dealIds = contact.deals.map((d) => d.id);
  const payments =
    dealIds.length > 0
      ? await db.payment.findMany({
          where: { ...scopePaymentsToSession(apiSession), dealId: { in: dealIds } },
          select: { dealId: true, amount: true },
        })
      : [];

  const paidByDeal = new Map<string, number>();
  for (const p of payments) {
    paidByDeal.set(p.dealId, (paidByDeal.get(p.dealId) ?? 0) + Number(p.amount));
  }

  const inScopeDealIds = new Set(
    contact.deals
      .filter((d) => apiSession.role === "ADMIN" || d.assignedToId === apiSession.userId)
      .map((d) => d.id)
  );

  const totalPaid = [...inScopeDealIds].reduce((sum, id) => sum + (paidByDeal.get(id) ?? 0), 0);
```

`payments` is filtered by `scopePaymentsToSession` — a `MEMBER` viewing this contact only ever gets payment rows for deals assigned to them, even if the contact has other deals assigned to other reps. `inScopeDealIds` mirrors the same rule for deals that have zero payments yet (so an in-scope $0-paid deal still shows "Unpaid", while an out-of-scope deal shows no badge at all rather than a misleading "Unpaid").

- [ ] **Step 2: Add the rollup line to the Deals card header**

Find:

```tsx
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Deals ({contact.deals.length})
              </CardTitle>
            </CardHeader>
```

Replace with:

```tsx
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Deals ({contact.deals.length})
              </CardTitle>
              {inScopeDealIds.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total paid: ${totalPaid.toLocaleString()} across {inScopeDealIds.size} deal
                  {inScopeDealIds.size === 1 ? "" : "s"}
                </p>
              )}
            </CardHeader>
```

- [ ] **Step 3: Add the payment status badge per deal row**

Find:

```tsx
                <ul className="divide-y text-sm">
                  {contact.deals.map((deal) => (
                    <li key={deal.id} className="flex items-center justify-between py-2">
                      <span>{deal.title}</span>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline">{deal.stage}</Badge>
                        <span className="font-medium">
                          ${Number(deal.value).toLocaleString()}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
```

Replace with:

```tsx
                <ul className="divide-y text-sm">
                  {contact.deals.map((deal) => {
                    const inScope = inScopeDealIds.has(deal.id);
                    const paid = paidByDeal.get(deal.id) ?? 0;
                    const dealValue = Number(deal.value);
                    const paymentStatus = !inScope
                      ? null
                      : dealValue <= 0
                        ? "Paid"
                        : paid <= 0
                          ? "Unpaid"
                          : paid >= dealValue
                            ? "Paid"
                            : "Partial";
                    return (
                      <li key={deal.id} className="flex items-center justify-between py-2">
                        <span>{deal.title}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline">{deal.stage}</Badge>
                          {paymentStatus && (
                            <Badge
                              variant="outline"
                              className={
                                paymentStatus === "Paid"
                                  ? "border-emerald-200 text-emerald-600"
                                  : paymentStatus === "Partial"
                                    ? "border-amber-200 text-amber-600"
                                    : "border-slate-200 text-slate-500"
                              }
                            >
                              {paymentStatus}
                            </Badge>
                          )}
                          <span className="font-medium">
                            ${dealValue.toLocaleString()}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
```

- [ ] **Step 4: Verify build**

Run: `rm -rf .next && npm run build`
Expected: zero errors.

- [ ] **Step 5: Manual end-to-end verification**

1. Log in as `demo@panelflo.com`. Open the contact detail page for "John Smith" (Acme Corp) — the URL is `/contacts/<id>`, reachable from `/contacts`.
   Expected: Deals card shows "Acme annual contract" with an "Unpaid" badge (no payments exist after Task 7's cleanup step) and no "Total paid" line if paid total is $0 — wait, the rollup line renders whenever `inScopeDealIds.size > 0`, regardless of the amount, so it should read "Total paid: $0 across 1 deal".
2. Go to `/finance`, log a payment of `4000` on "Acme annual contract".
3. Return to the contact page (or refresh).
   Expected: badge now reads "Partial", rollup line reads "Total paid: $4,000 across 1 deal".
4. Log a further payment of `8000` (reaching the full $12,000).
   Expected: badge reads "Paid".
5. Log out, log in as `member@panelflo.com`, open the same John Smith contact page (any workspace user can view any contact — this is existing behavior, unchanged by this plan).
   Expected: no payment badge next to "Acme annual contract" (out of the member's scope), and no "Total paid" line (member has zero in-scope deals on this particular contact).
6. Clean up: delete the two Acme payments from `/finance` as the admin, restoring `/finance` to its empty state.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/contacts/[id]/page.tsx"
git commit -m "feat(finance): show payment status and paid total on contact detail page"
```
