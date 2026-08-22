# Sales & Inventory Integration — Design

## Goal

Connect `Deal` to `Product` so a won sale can decrement stock automatically, without disturbing deals that don't involve inventory (services, custom quotes).

## Current state (verified against source before designing)

- `Deal` and `Product` have zero relation today. `Deal.value` is one flat manually-entered number.
- `StockMovement` is only ever created from the Stock page UI or the bot's `ADJUST_STOCK` action, both going through `lib/stock.ts`'s `adjustStock()` — the single entry point for all quantity changes, chosen specifically so "the movement ledger stays complete and low-stock alerts fire exactly once per crossing" (its own doc comment).
- `adjustStock()` already throws `StockError` and blocks the change if the resulting quantity would go negative — this is an existing, intentional invariant, not something this feature introduces.
- Pipeline stages (`PipelineColumn`) are free-text and fully custom per workspace (from the earlier Contact Statuses–style migration) — nothing today marks which stage means "sold."
- `PATCH /api/deals/[id]` already handles stage changes; the kanban's `onDragEnd` calls it and reverts the optimistic UI move on any non-200 response.

## Decisions made during brainstorming (with the user)

1. **`Deal.value` stays manual.** Products attached to a deal are optional and don't compute or override it. A deal with zero line items behaves exactly as today.
2. **Insufficient stock at deal-won blocks the stage move.** Reuses `adjustStock`'s existing `StockError` rather than adding an inconsistent bypass — deal-won is not special-cased to allow negative stock when nothing else in the app can.
3. **Exactly one won stage per workspace.** `isWonStage` is effectively single-select, enforced server-side.
4. **Leaving the won stage auto-reverses the stock movement.** Keeps stock accurate through drag mistakes or reopened deals without manual cleanup.
5. **Non-goal:** editing a deal's line items while it is already in the won stage does not retroactively adjust stock. Only the stage *transition* triggers a movement; correcting quantities after the fact is a manual stock adjustment, same as today.
6. **Bot actions unchanged.** `CREATE_DEAL`/`MOVE_DEAL` in `lib/bot-actions.ts` get no line-item support in this pass.
7. **Team-member role-based permissions are explicitly out of scope for this feature** — a separate, not-yet-brainstormed piece of work.

## Schema

```prisma
model PipelineColumn {
  // ...existing fields unchanged
  isWonStage Boolean @default(false)
}

model DealLineItem {
  id              String   @id @default(cuid())
  dealId          String
  productId       String
  quantity        Int
  unitPriceAtSale Decimal  @db.Decimal(12, 2)
  createdAt       DateTime @default(now())

  deal    Deal    @relation(fields: [dealId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@index([dealId])
  @@index([productId])
}
```

`Deal` and `Product` each get a `lineItems DealLineItem[]` back-relation. `onDelete: Restrict` on `product` — deleting inventory that's tied to sales history fails loudly (Prisma throws a foreign-key-constraint error) rather than silently orphaning `DealLineItem` rows.

Migration follows the same hand-written, Postgres-18-safe pattern already used for the Contact Statuses migration (`prisma migrate deploy`, not `migrate dev`, given the known pre-existing checksum drift on this database from an earlier hand-edited migration).

## `isWonStage` enforcement

`PATCH /api/pipeline/columns/[id]` (existing route): when the request body sets `isWonStage: true`, first clear it (`isWonStage: false`) on every other `PipelineColumn` in that workspace, in the same transaction as the update. No new endpoint.

`components/pipeline/kanban.tsx`'s `EditColumnPopover` gets one new toggle (checkbox or switch) bound to this field, alongside the existing label/color editor.

## Line items UI

`components/pipeline/deal-form.tsx` gains a product-line section between the existing fields and the save button:
- A row per attached line item: product name (from a searchable picker, reusing the `Select` pattern already used for contact/assignee pickers elsewhere in this form), quantity input, a remove button.
- An "Add product" affordance below the rows, matching the CSV import dialog's add-row interaction shape already in the codebase.
- `unitPriceAtSale` defaults to the product's current `unitPrice` at the moment it's added to the deal (a snapshot, not a live reference — so past deals stay historically accurate even if the product's price changes later).

The deal-detail views that already render `Deal.stage` and `Deal.value` (contact detail page's Deals card, pipeline kanban cards) are unaffected — line items are additive, not a replacement for anything currently displayed. Surfacing line items in those read views is not required for this pass; only the edit form needs them.

## Stock-decrement trigger

Inside `PATCH /api/deals/[id]`, after loading the existing deal and validating the request body as today:

1. Resolve the deal's **current** stage and the **requested** stage against `getWorkspacePipelineColumns()`, reading each one's `isWonStage`.
2. **Entering** the won stage (current: `false` → requested: `true`):
   - Load the deal's `DealLineItem`s (with their `Product`).
   - For each line item, call `adjustStock({ product, delta: -quantity, reason: "Deal won: " + deal.title, actorUserId: session user })` inside a transaction alongside the deal's own stage update.
   - If any call throws `StockError`, abort the entire request (roll back, including the stage change itself) and return `400` with the error's message. The kanban already reverts its optimistic move on non-200.
3. **Leaving** the won stage (current: `true` → requested: `false`):
   - Same line-item loop, but `delta: +quantity, reason: "Deal reopened: " + deal.title`. This direction cannot trigger `StockError` (quantity only increases).
4. Both-false or both-true stage pairs (including a plain label rename that keeps `isWonStage` unchanged): no stock movement, existing update behavior only.

This logic lives in the route handler itself (or a small helper it calls), not in `lib/stock.ts` — `adjustStock` stays a single-purpose primitive; the "what triggers an adjustment" decision belongs to the caller, matching how `ADJUST_STOCK` (bot) and the manual stock-page UI already each decide independently when to call it.

## Testing

No automated test suite exists in this project (confirmed earlier this session — `package.json` has no `test` script). Verification is: `npx tsc --noEmit`, then live checks in the browser — attach products to a deal, drag it into the won stage and confirm stock decrements and a `StockMovement`/`Activity` row appears, drag it back out and confirm the reversal, and attempt a won-stage move with insufficient stock and confirm it's blocked with the correct error surfaced in the UI. Both light and dark mode for any new UI (the product-line section, the `isWonStage` toggle).
