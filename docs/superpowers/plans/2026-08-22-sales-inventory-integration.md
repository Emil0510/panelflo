# Sales & Inventory Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect deals to products so winning a deal automatically decrements stock, with the whole change (deal update + every line item's stock movement) succeeding or failing together.

**Architecture:** A new `DealLineItem` join model between `Deal` and `Product`. A new `isWonStage` boolean on `PipelineColumn`, single-select per workspace. The existing `PATCH /api/deals/[id]` route (already the sole place stage changes happen) gains the trigger logic, running inside one Prisma interactive transaction alongside the deal update and line-item replacement. `lib/stock.ts`'s `adjustStock()` — the app's single entry point for all quantity changes — gets a small backward-compatible extension so it can join a caller-supplied transaction instead of always opening its own, which is what makes the "all-or-nothing across N line items" guarantee possible.

**Tech Stack:** Next.js 14 App Router, Prisma 6.19 (PostgreSQL, Neon), Zod, dnd-kit (existing kanban drag-and-drop), Tailwind/shadcn.

**Spec:** `docs/superpowers/specs/2026-08-22-sales-inventory-integration-design.md`

## Global Constraints

- No new npm dependencies.
- `Deal.value` stays manual — never computed from line items.
- Insufficient stock at deal-won blocks the entire stage move (no partial stock changes persist).
- Exactly one `isWonStage` column per workspace, enforced server-side.
- Leaving the won stage auto-reverses the stock movement.
- Editing line items while a deal is already in the won stage does not retroactively adjust stock — only the stage *transition* triggers a movement.
- No line-item support in `lib/bot-actions.ts` (`CREATE_DEAL`/`MOVE_DEAL`) in this pass.
- No `Role`/permission changes — that's separate, unscoped work.
- Migrations apply via `prisma migrate deploy` (hand-written migration.sql), not `prisma migrate dev` — this database has pre-existing checksum drift on an earlier hand-edited migration that makes `migrate dev`'s shadow-DB diffing offer a destructive reset. Always run `set -a; source .env.local; set +a;` before any `npx prisma` command so `DATABASE_URL` is loaded.
- No automated test suite exists in this project — verification is `npx tsc --noEmit` plus live browser checks (light + dark mode) via the Claude Browser preview tools.

---

### Task 1: Schema — `isWonStage` + `DealLineItem`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260822_sales_inventory_integration/migration.sql`

**Interfaces:**
- Produces: `PipelineColumn.isWonStage: boolean`, `DealLineItem { id, dealId, productId, quantity, unitPriceAtSale, createdAt }`, `Deal.lineItems: DealLineItem[]`, `Product.dealLineItems: DealLineItem[]`. Tasks 3, 6, 7, 8 all read/write through these exact names.

- [ ] **Step 1: Edit the schema**

In `prisma/schema.prisma`, find the `PipelineColumn` model and add the new field (keep every existing field as-is):

```prisma
model PipelineColumn {
  id          String    @id @default(cuid())
  workspaceId String
  key         String
  label       String
  color       String    @default("#64748B")
  order       Int
  isSystem    Boolean   @default(false)
  isWonStage  Boolean   @default(false)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, key])
  @@index([workspaceId])
}
```

Find the `Deal` model and add a back-relation (keep every existing field/relation as-is, just add the last line before the closing brace):

```prisma
model Deal {
  id           String    @id @default(cuid())
  workspaceId  String
  contactId    String?
  title        String
  value        Decimal   @default(0) @db.Decimal(12, 2)
  stage        String    @default("LEAD")
  assignedToId String?
  lastMovedAt  DateTime  @default(now())
  createdAt    DateTime  @default(now())

  workspace  Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  contact    Contact?  @relation(fields: [contactId], references: [id], onDelete: SetNull)
  assignedTo User?     @relation("DealAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  tasks      Task[]
  lineItems  DealLineItem[]

  @@index([workspaceId])
}
```

Find the `Product` model and add a back-relation the same way:

```prisma
model Product {
  id                String   @id @default(cuid())
  workspaceId       String
  name              String
  sku               String?
  unitPrice         Decimal  @default(0) @db.Decimal(12, 2)
  quantity          Int      @default(0)
  lowStockThreshold Int      @default(0)
  notes             String?
  deleted           Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  workspace     Workspace       @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  movements     StockMovement[]
  dealLineItems DealLineItem[]

  @@unique([workspaceId, sku])
  @@index([workspaceId])
}
```

Add the new `DealLineItem` model near `PipelineColumn`/`TaskColumn`/`ContactColumn`:

```prisma
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

- [ ] **Step 2: Write the migration by hand**

Create `prisma/migrations/20260822_sales_inventory_integration/migration.sql`:

```sql
-- Add isWonStage flag to PipelineColumn
ALTER TABLE "PipelineColumn" ADD COLUMN "isWonStage" BOOLEAN NOT NULL DEFAULT false;

-- Create DealLineItem table
CREATE TABLE "DealLineItem" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceAtSale" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealLineItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DealLineItem_dealId_idx" ON "DealLineItem"("dealId");
CREATE INDEX "DealLineItem_productId_idx" ON "DealLineItem"("productId");
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply the migration and regenerate the client**

Run:
```bash
cd /Users/emilabdurahmanli/Documents/panelflo/sourcecode
set -a; source .env.local; set +a
npx prisma migrate deploy
npx prisma generate
```
Expected: `All migrations have been successfully applied.` then `Generated Prisma Client`. Do NOT run `prisma migrate dev` — see Global Constraints.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p .`
Expected: same errors as before this task (there will be pre-existing errors from later tasks not yet done — at this point in isolation there should be zero new errors, since nothing references the new fields yet).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260822_sales_inventory_integration
git commit -m "feat(pipeline): add isWonStage flag and DealLineItem model"
```

---

### Task 2: `lib/stock.ts` — transaction-composable `adjustStock`

**Files:**
- Modify: `lib/stock.ts` (full file — small enough to replace wholesale)

**Interfaces:**
- Consumes: nothing new.
- Produces: `adjustStock(opts: { product: Product; delta: number; reason?: string | null; actorUserId?: string | null; tx?: Prisma.TransactionClient }): Promise<Product>` — same signature as before plus the optional `tx`. `notifyIfLowStockCrossed(before: Product, after: Product): Promise<void>` — new export. Task 3 uses both.

- [ ] **Step 1: Replace the file**

Replace the full contents of `lib/stock.ts` with:

```typescript
import { Prisma, Product } from "@prisma/client";

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export function isLowStock(p: Pick<Product, "quantity" | "lowStockThreshold">) {
  return p.quantity <= p.lowStockThreshold;
}

export class StockError extends Error {}

/**
 * Sends the low-stock notification if this change crossed the threshold
 * going down. Split out from adjustStock so a caller composing several
 * adjustStock calls inside one transaction can defer notifications until
 * after that transaction actually commits.
 */
export async function notifyIfLowStockCrossed(before: Product, after: Product) {
  const crossedDown =
    before.quantity > before.lowStockThreshold && after.quantity <= after.lowStockThreshold;
  if (!crossedDown) return;

  const users = await db.user.findMany({
    where: { workspaceId: after.workspaceId },
    select: { id: true },
  });
  await Promise.all(
    users.map((u) =>
      createNotification({
        userId: u.id,
        workspaceId: after.workspaceId,
        title: `Low stock: ${after.name}`,
        body: `${after.quantity} left (threshold ${after.lowStockThreshold})`,
        type: "SYSTEM",
        link: "/stock",
      })
    )
  );
}

/**
 * Single entry point for all quantity changes (web + bot) so the movement
 * ledger stays complete and low-stock alerts fire exactly once per crossing.
 *
 * Pass `tx` to run inside a caller-managed transaction (e.g. one deal update
 * plus several line items' stock movements as one atomic unit) — in that
 * case the caller is responsible for calling notifyIfLowStockCrossed itself
 * after the outer transaction commits, since notifying before commit could
 * announce a change that later gets rolled back.
 */
export async function adjustStock(opts: {
  product: Product;
  delta: number;
  reason?: string | null;
  actorUserId?: string | null;
  tx?: Prisma.TransactionClient;
}): Promise<Product> {
  const { product, delta } = opts;

  const after = product.quantity + delta;
  if (after < 0) {
    throw new StockError(
      `Only ${product.quantity} in stock — cannot remove ${Math.abs(delta)}`
    );
  }

  const direction = delta > 0 ? "+" : "";
  const reasonSuffix = opts.reason?.trim() ? ` — ${opts.reason.trim()}` : "";
  const activityContent = `Stock ${delta > 0 ? "in" : "out"}: ${product.name} ${direction}${delta}${reasonSuffix}`;

  async function doWrites(client: Prisma.TransactionClient) {
    const updated = await client.product.update({
      where: { id: product.id },
      data: { quantity: { increment: delta } },
    });
    await client.stockMovement.create({
      data: {
        workspaceId: product.workspaceId,
        productId: product.id,
        delta,
        reason: opts.reason?.trim() || null,
        createdById: opts.actorUserId ?? null,
      },
    });
    await client.activity.create({
      data: {
        workspaceId: product.workspaceId,
        type: "STOCK_MOVEMENT",
        content: activityContent,
        createdById: opts.actorUserId ?? null,
      },
    });
    return updated;
  }

  const updated = opts.tx ? await doWrites(opts.tx) : await db.$transaction((tx) => doWrites(tx));

  if (!opts.tx) {
    await notifyIfLowStockCrossed(product, updated);
  }

  return updated;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (this is a backward-compatible signature extension — every existing caller of `adjustStock` omits `tx` and gets identical behavior to before).

- [ ] **Step 3: Commit**

```bash
git add lib/stock.ts
git commit -m "feat(stock): let adjustStock join a caller-supplied transaction"
```

---

### Task 3: `lib/deals.ts` — won-transition stock helper

**Files:**
- Create: `lib/deals.ts`

**Interfaces:**
- Consumes: `adjustStock`, `notifyIfLowStockCrossed`, `StockError` from `@/lib/stock` (Task 2).
- Produces: `applyStockForWonTransition(tx: Prisma.TransactionClient, opts: { lineItems: { productId: string; quantity: number }[]; entering: boolean; dealTitle: string; actorUserId: string }): Promise<{ before: Product; after: Product }[]>`. Task 6 and Task 7 both call this.

- [ ] **Step 1: Create the file**

```typescript
import { Prisma, Product } from "@prisma/client";

import { adjustStock } from "@/lib/stock";

export { StockError } from "@/lib/stock";

export type LineItemInput = { productId: string; quantity: number };

/**
 * Applies (or reverses) stock movements for a deal's line items when the
 * deal enters or leaves the workspace's won stage. Must run inside the
 * same transaction as the deal's own stage update, so an insufficient-stock
 * failure on any line item rolls back the whole thing — no partial stock
 * changes and no stage change without matching stock movements.
 *
 * entering=true consumes stock (delta is negative per item); entering=false
 * restores it (delta is positive). Returns before/after Product pairs so
 * the caller can fire low-stock notifications once the outer transaction
 * has actually committed.
 */
export async function applyStockForWonTransition(
  tx: Prisma.TransactionClient,
  opts: {
    lineItems: LineItemInput[];
    entering: boolean;
    dealTitle: string;
    actorUserId: string;
  }
): Promise<{ before: Product; after: Product }[]> {
  const direction = opts.entering ? -1 : 1;
  const reason = (opts.entering ? "Deal won: " : "Deal reopened: ") + opts.dealTitle;

  const results: { before: Product; after: Product }[] = [];
  for (const item of opts.lineItems) {
    const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
    const updated = await adjustStock({
      product,
      delta: direction * item.quantity,
      reason,
      actorUserId: opts.actorUserId,
      tx,
    });
    results.push({ before: product, after: updated });
  }
  return results;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/deals.ts
git commit -m "feat(deals): add applyStockForWonTransition helper"
```

---

### Task 4: `isWonStage` single-select enforcement

**Files:**
- Modify: `app/api/pipeline/columns/[id]/route.ts:5-24` (the `PATCH` handler)

**Interfaces:**
- Consumes: nothing new.
- Produces: `PATCH /api/pipeline/columns/[id]` now accepts an optional `isWonStage: boolean` in its body and returns it on the updated column.

- [ ] **Step 1: Edit the PATCH handler**

Find this in `app/api/pipeline/columns/[id]/route.ts`:

```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await db.pipelineColumn.findUnique({ where: { id: params.id } });
  if (!col || col.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { label, color } = await req.json();
  const updated = await db.pipelineColumn.update({
    where: { id: params.id },
    data: {
      ...(label?.trim() ? { label: label.trim() } : {}),
      ...(color ? { color } : {}),
    },
  });

  return NextResponse.json(updated);
}
```

Replace with:

```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await db.pipelineColumn.findUnique({ where: { id: params.id } });
  if (!col || col.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { label, color, isWonStage } = await req.json();

  const updated = await db.$transaction(async (tx) => {
    if (isWonStage === true) {
      await tx.pipelineColumn.updateMany({
        where: { workspaceId: session.user.workspaceId, id: { not: params.id } },
        data: { isWonStage: false },
      });
    }
    return tx.pipelineColumn.update({
      where: { id: params.id },
      data: {
        ...(label?.trim() ? { label: label.trim() } : {}),
        ...(color ? { color } : {}),
        ...(typeof isWonStage === "boolean" ? { isWonStage } : {}),
      },
    });
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/pipeline/columns/[id]/route.ts"
git commit -m "feat(pipeline): single-select isWonStage on column update"
```

---

### Task 5: Kanban UI — `isWonStage` toggle + type update

**Files:**
- Modify: `components/pipeline/kanban.tsx:26-33` (`KanbanColumn` type), `:108-189` (`EditColumnPopover`)
- Modify: `app/(dashboard)/pipeline/page.tsx` (no change needed — `getWorkspacePipelineColumns` already returns full `PipelineColumn` rows including the new field, and `columns={columns}` is passed straight through)

**Interfaces:**
- Consumes: `PATCH /api/pipeline/columns/[id]` now accepting `isWonStage` (Task 4).
- Produces: `KanbanColumn` type gains `isWonStage: boolean`. `handleColSave` in `PipelineKanban` gains a fourth parameter. Task 9 does not touch this file further.

- [ ] **Step 1: Update the `KanbanColumn` type**

Find:
```typescript
export type KanbanColumn = {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  isSystem: boolean;
};
```

Replace with:
```typescript
export type KanbanColumn = {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  isSystem: boolean;
  isWonStage: boolean;
};
```

- [ ] **Step 2: Add the toggle to `EditColumnPopover`**

Find the `EditColumnPopover` function signature and its `onSave` prop type:

```typescript
function EditColumnPopover({
  col,
  dealsCount,
  totalColumns,
  onSave,
  onDelete,
  onClose,
}: {
  col: KanbanColumn;
  dealsCount: number;
  totalColumns: number;
  onSave: (label: string, color: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(col.label);
  const [color, setColor] = useState(col.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!label.trim()) { setError("Name required"); return; }
    setSaving(true);
    await onSave(label.trim(), color);
    setSaving(false);
    onClose();
  }
```

Replace with:

```typescript
function EditColumnPopover({
  col,
  dealsCount,
  totalColumns,
  onSave,
  onDelete,
  onClose,
}: {
  col: KanbanColumn;
  dealsCount: number;
  totalColumns: number;
  onSave: (label: string, color: string, isWonStage: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(col.label);
  const [color, setColor] = useState(col.color);
  const [isWonStage, setIsWonStage] = useState(col.isWonStage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!label.trim()) { setError("Name required"); return; }
    setSaving(true);
    await onSave(label.trim(), color, isWonStage);
    setSaving(false);
    onClose();
  }
```

Now find the color-picker block inside the same component's JSX:

```typescript
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-10 cursor-pointer rounded border"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
```

Replace with (adds the checkbox row directly below color):

```typescript
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-10 cursor-pointer rounded border"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={isWonStage}
            onChange={(e) => setIsWonStage(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border"
          />
          Counts as sold (decrements stock)
        </label>
        {error && <p className="text-xs text-red-500">{error}</p>}
```

- [ ] **Step 3: Thread the new parameter down to `StageColumn` and `PipelineKanban`**

Find in `StageColumn`'s props type:
```typescript
  onColSave: (id: string, label: string, color: string) => Promise<void>;
```
Replace with:
```typescript
  onColSave: (id: string, label: string, color: string, isWonStage: boolean) => Promise<void>;
```

Find where `StageColumn` renders `EditColumnPopover`:
```typescript
        <EditColumnPopover
          col={col}
          dealsCount={deals.length}
          totalColumns={totalColumns}
          onSave={(label, color) => onColSave(col.id, label, color)}
          onDelete={() => onColDelete(col.id)}
          onClose={() => setEditOpen(false)}
        />
```
Replace with:
```typescript
        <EditColumnPopover
          col={col}
          dealsCount={deals.length}
          totalColumns={totalColumns}
          onSave={(label, color, isWonStage) => onColSave(col.id, label, color, isWonStage)}
          onDelete={() => onColDelete(col.id)}
          onClose={() => setEditOpen(false)}
        />
```

Find `handleColSave` in `PipelineKanban`:
```typescript
  async function handleColSave(id: string, label: string, color: string) {
    const res = await fetch(`/api/pipeline/columns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color }),
    });
    if (res.ok) {
      setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, label, color } : c)));
    }
  }
```
Replace with:
```typescript
  async function handleColSave(id: string, label: string, color: string, isWonStage: boolean) {
    const res = await fetch(`/api/pipeline/columns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color, isWonStage }),
    });
    if (res.ok) {
      setColumns((prev) =>
        prev.map((c) => ({
          ...c,
          ...(c.id === id ? { label, color, isWonStage } : isWonStage ? { isWonStage: false } : {}),
        }))
      );
    }
  }
```

(That last replacement mirrors the server's single-select behavior on the client: setting one column's `isWonStage` true optimistically clears it on every other column too, so the UI doesn't show two "counts as sold" columns until the next `router.refresh()`.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p .`
Expected: errors only in files not yet touched by this plan (`app/(dashboard)/pipeline/page.tsx` passing `columns` from `getWorkspacePipelineColumns` — that function already returns rows with `isWonStage` after Task 1's migration, so this should actually be clean). If there's an error here, it means Task 1 wasn't fully applied — stop and check `npx prisma generate` ran.

- [ ] **Step 5: Commit**

```bash
git add components/pipeline/kanban.tsx
git commit -m "feat(pipeline): add isWonStage toggle to column editor"
```

---

### Task 6: Deals PATCH route — line items + won-transition trigger

**Files:**
- Modify: `app/api/deals/[id]/route.ts` (full file)

**Interfaces:**
- Consumes: `getWorkspacePipelineColumns` from `@/lib/columns`, `applyStockForWonTransition`, `StockError` from `@/lib/deals` (Task 3), `notifyIfLowStockCrossed` from `@/lib/stock` (Task 2).
- Produces: `PATCH /api/deals/[id]` now accepts an optional `lineItems: { productId: string; quantity: number }[]` in its body (when present, fully replaces the deal's line items) and triggers stock movements on won-stage transitions. Also fixes a pre-existing bug: `stage` was validated with `z.enum(["LEAD","CONTACTED","PROPOSAL","WON","LOST"])`, which silently rejects any custom pipeline stage a workspace has added — since stages have been free-text since the Contact-Statuses-era pipeline migration, this already breaks moving a deal into a custom column today, independent of this feature.

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/api/deals/[id]/route.ts` with:

```typescript
import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { getWorkspacePipelineColumns } from "@/lib/columns";
import { applyStockForWonTransition, StockError } from "@/lib/deals";
import { db } from "@/lib/db";
import { triggerN8n } from "@/lib/n8n";
import { notifyIfLowStockCrossed } from "@/lib/stock";

const lineItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  value: z.number().min(0).optional(),
  stage: z.string().min(1).max(50).optional(),
  contactId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const deal = await db.deal.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
    include: {
      contact: true,
      assignedTo: true,
      tasks: { where: { deleted: false } },
      lineItems: { include: { product: { select: { id: true, name: true } } } },
    },
  });
  if (!deal) return fail("Deal not found", 404);
  return ok(deal);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.deal.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
    include: { contact: true, lineItems: true },
  });
  if (!existing) return fail("Deal not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const stageChanged =
    parsed.data.stage !== undefined && parsed.data.stage !== existing.stage;

  let wonBefore = false;
  let wonAfter = false;
  if (stageChanged) {
    const cols = await getWorkspacePipelineColumns(session.workspaceId);
    wonBefore = cols.find((c) => c.key === existing.stage)?.isWonStage ?? false;
    wonAfter = cols.find((c) => c.key === parsed.data.stage)?.isWonStage ?? false;
  }

  const effectiveLineItems = parsed.data.lineItems
    ? parsed.data.lineItems
    : existing.lineItems.map((li) => ({ productId: li.productId, quantity: li.quantity }));

  try {
    const [deal, notifyPairs] = await db.$transaction(async (tx) => {
      if (parsed.data.lineItems) {
        await tx.dealLineItem.deleteMany({ where: { dealId: existing.id } });
        for (const li of parsed.data.lineItems) {
          const product = await tx.product.findFirst({
            where: { id: li.productId, workspaceId: session.workspaceId },
          });
          if (!product) throw new StockError("One of the selected products no longer exists");
          await tx.dealLineItem.create({
            data: {
              dealId: existing.id,
              productId: li.productId,
              quantity: li.quantity,
              unitPriceAtSale: product.unitPrice,
            },
          });
        }
      }

      const updated = await tx.deal.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
          ...(parsed.data.value !== undefined ? { value: parsed.data.value } : {}),
          ...(parsed.data.stage !== undefined ? { stage: parsed.data.stage } : {}),
          ...(parsed.data.contactId !== undefined
            ? { contactId: parsed.data.contactId === "" ? null : parsed.data.contactId }
            : {}),
          ...(parsed.data.assignedToId !== undefined
            ? { assignedToId: parsed.data.assignedToId === "" ? null : parsed.data.assignedToId }
            : {}),
          ...(stageChanged ? { lastMovedAt: new Date() } : {}),
        },
      });

      let notifyPairs: Awaited<ReturnType<typeof applyStockForWonTransition>> = [];
      if (wonBefore !== wonAfter && effectiveLineItems.length > 0) {
        notifyPairs = await applyStockForWonTransition(tx, {
          lineItems: effectiveLineItems,
          entering: wonAfter,
          dealTitle: updated.title,
          actorUserId: session.userId,
        });
      }

      if (stageChanged) {
        await tx.activity.create({
          data: {
            workspaceId: session.workspaceId,
            contactId: existing.contactId,
            type: "DEAL_MOVED",
            content: `Deal "${existing.title}" moved from ${existing.stage} to ${updated.stage}`,
            createdById: session.userId,
          },
        });
      }

      return [updated, notifyPairs] as const;
    });

    for (const { before, after } of notifyPairs) {
      await notifyIfLowStockCrossed(before, after);
    }

    if (stageChanged) {
      void triggerN8n({
        event: "deal-moved",
        dealId: deal.id,
        workspaceId: session.workspaceId,
        stage: deal.stage,
      });
    }

    return ok(deal);
  } catch (err) {
    if (err instanceof StockError) return fail(err.message, 400);
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.deal.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!existing) return fail("Deal not found", 404);

  await db.deal.delete({ where: { id: existing.id } });
  return ok({ deleted: true });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no new errors in this file.

- [ ] **Step 3: Commit**

```bash
git add "app/api/deals/[id]/route.ts"
git commit -m "feat(deals): trigger stock movements on won-stage transitions"
```

---

### Task 7: Deals POST route — line items on create + won-on-create

**Files:**
- Modify: `app/api/deals/route.ts` (full file)

**Interfaces:**
- Consumes: same as Task 6.
- Produces: `POST /api/deals` accepts the same optional `lineItems` field and runs the won-transition trigger if the deal is created directly into the won stage. Also fixes the same pre-existing `z.enum(fixed list)` bug for `stage` (and for the `GET` query-param filter).

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/api/deals/route.ts` with:

```typescript
import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { getWorkspacePipelineColumns } from "@/lib/columns";
import { applyStockForWonTransition, StockError } from "@/lib/deals";
import { db } from "@/lib/db";
import { notifyIfLowStockCrossed } from "@/lib/stock";

const lineItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const dealSchema = z.object({
  title: z.string().min(1).max(200),
  value: z.number().min(0).optional(),
  stage: z.string().min(1).max(50).optional(),
  contactId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");

  const deals = await db.deal.findMany({
    where: {
      workspaceId: session.workspaceId,
      ...(stage ? { stage } : {}),
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { lastMovedAt: "desc" },
  });

  return ok(deals, { count: deals.length });
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = dealSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const stage = parsed.data.stage ?? "LEAD";
  let wonOnCreate = false;
  if (parsed.data.lineItems && parsed.data.lineItems.length > 0) {
    const cols = await getWorkspacePipelineColumns(session.workspaceId);
    wonOnCreate = cols.find((c) => c.key === stage)?.isWonStage ?? false;
  }

  try {
    const [deal, notifyPairs] = await db.$transaction(async (tx) => {
      const created = await tx.deal.create({
        data: {
          workspaceId: session.workspaceId,
          title: parsed.data.title,
          value: parsed.data.value ?? 0,
          stage,
          contactId: parsed.data.contactId || null,
          assignedToId: parsed.data.assignedToId || null,
        },
      });

      if (parsed.data.lineItems) {
        for (const li of parsed.data.lineItems) {
          const product = await tx.product.findFirst({
            where: { id: li.productId, workspaceId: session.workspaceId },
          });
          if (!product) throw new StockError("One of the selected products no longer exists");
          await tx.dealLineItem.create({
            data: {
              dealId: created.id,
              productId: li.productId,
              quantity: li.quantity,
              unitPriceAtSale: product.unitPrice,
            },
          });
        }
      }

      let notifyPairs: Awaited<ReturnType<typeof applyStockForWonTransition>> = [];
      if (wonOnCreate && parsed.data.lineItems) {
        notifyPairs = await applyStockForWonTransition(tx, {
          lineItems: parsed.data.lineItems,
          entering: true,
          dealTitle: created.title,
          actorUserId: session.userId,
        });
      }

      return [created, notifyPairs] as const;
    });

    for (const { before, after } of notifyPairs) {
      await notifyIfLowStockCrossed(before, after);
    }

    return ok(deal);
  } catch (err) {
    if (err instanceof StockError) return fail(err.message, 400);
    throw err;
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no new errors in this file.

- [ ] **Step 3: Commit**

```bash
git add "app/api/deals/route.ts"
git commit -m "feat(deals): support line items and won-on-create in deal creation"
```

---

### Task 8: `deal-form.tsx` — line items UI

**Files:**
- Modify: `components/pipeline/deal-form.tsx` (full file)

**Interfaces:**
- Consumes: nothing new from earlier tasks directly — this is presentational, talking to the API routes from Tasks 6/7.
- Produces: `DealFormValues` gains `lineItems: { productId: string; quantity: number }[]`. `DealFormSheet` gains a required `products: { id: string; name: string; unitPrice: number }[]` prop. Task 9 supplies both.

- [ ] **Step 1: Replace the file**

Replace the full contents of `components/pipeline/deal-form.tsx` with:

```tsx
"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
} from "@/components/ui/sheet";

export type DealLineItemValue = { productId: string; quantity: number };

export type DealFormValues = {
  id?: string;
  title: string;
  value: string;
  stage: string;
  contactId: string;
  assignedToId: string;
  lineItems: DealLineItemValue[];
};

function LineItemsEditor({
  lineItems,
  products,
  onChange,
}: {
  lineItems: DealLineItemValue[];
  products: { id: string; name: string; unitPrice: number }[];
  onChange: (items: DealLineItemValue[]) => void;
}) {
  function addRow() {
    const firstUnused = products.find((p) => !lineItems.some((li) => li.productId === p.id));
    if (!firstUnused) return;
    onChange([...lineItems, { productId: firstUnused.id, quantity: 1 }]);
  }

  function updateRow(index: number, patch: Partial<DealLineItemValue>) {
    onChange(lineItems.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  function removeRow(index: number) {
    onChange(lineItems.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1.5">
      <Label>Products</Label>
      {lineItems.length === 0 && (
        <p className="text-xs text-muted-foreground">No products attached — this deal is tracked by value only.</p>
      )}
      <div className="space-y-2">
        {lineItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={item.productId}
              onValueChange={(v) => updateRow(i, { productId: v })}
            >
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              step="1"
              value={item.quantity}
              onChange={(e) => updateRow(i, { quantity: Number(e.target.value) || 1 })}
              className="h-8 w-16 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeRow(i)}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
      {lineItems.length < products.length && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" />
          Add product
        </Button>
      )}
    </div>
  );
}

export function DealFormSheet({
  open,
  onOpenChange,
  initial,
  contacts,
  users,
  columns,
  products,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DealFormValues;
  contacts: { id: string; name: string }[];
  users: { id: string; name: string | null }[];
  columns: { key: string; label: string }[];
  products: { id: string; name: string; unitPrice: number }[];
  onDelete?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastKey, setLastKey] = useState(initial.id ?? "new");
  const key = initial.id ?? `new-${initial.stage}`;
  if (key !== lastKey) {
    setLastKey(key);
    setValues(initial);
  }

  function set<K extends keyof DealFormValues>(k: K, v: DealFormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    if (!values.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    const isEdit = Boolean(values.id);
    const res = await fetch(isEdit ? `/api/deals/${values.id}` : "/api/deals", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        value: Number(values.value) || 0,
        stage: values.stage,
        contactId: values.contactId || null,
        assignedToId: values.assignedToId || null,
        lineItems: values.lineItems,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to save deal");
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  async function remove() {
    if (!values.id) return;
    setSaving(true);
    await fetch(`/api/deals/${values.id}`, { method: "DELETE" });
    setSaving(false);
    onOpenChange(false);
    onDelete?.();
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{values.id ? "Edit deal" : "Add deal"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={values.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Value ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={values.value}
                onChange={(e) => set("value", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select
                value={values.stage}
                onValueChange={(v) => set("stage", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Contact</Label>
            <Select
              value={values.contactId || "none"}
              onValueChange={(v) => set("contactId", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No contact</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned to</Label>
            <Select
              value={values.assignedToId || "unassigned"}
              onValueChange={(v) => set("assignedToId", v === "unassigned" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? "Unnamed"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {products.length > 0 && (
            <LineItemsEditor
              lineItems={values.lineItems}
              products={products}
              onChange={(items) => set("lineItems", items)}
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : values.id ? "Save changes" : "Add deal"}
            </Button>
            {values.id && (
              <Button variant="destructive" onClick={remove} disabled={saving}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p .`
Expected: errors only in `components/pipeline/kanban.tsx` (Task 9 fixes those — it constructs `DealFormValues` without `lineItems` and calls `<DealFormSheet>` without `products` yet).

- [ ] **Step 3: Commit**

```bash
git add components/pipeline/deal-form.tsx
git commit -m "feat(deals): add product line-items editor to the deal form"
```

---

### Task 9: Wire products + line items through kanban and the pipeline page

**Files:**
- Modify: `app/(dashboard)/pipeline/page.tsx` (full file)
- Modify: `components/pipeline/kanban.tsx:35-43` (`DealCard` type), `:353-359` (initial `formInitial` state), `:417-432` (`openAdd`/`openEdit`), `:336-346` (`PipelineKanban` props), `:492-499` (the `<DealFormSheet>` render)

**Interfaces:**
- Consumes: `products` prop shape from Task 8 (`{ id: string; name: string; unitPrice: number }[]`).
- Produces: nothing further downstream — this is the last task.

- [ ] **Step 1: Fetch products in the pipeline page**

Replace the full contents of `app/(dashboard)/pipeline/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

import { PipelineKanban } from "@/components/pipeline/kanban";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspacePipelineColumns } from "@/lib/columns";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [deals, contacts, users, columns, products] = await Promise.all([
    db.deal.findMany({
      where: { workspaceId: session.user.workspaceId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        assignedTo: { select: { id: true, name: true } },
        lineItems: true,
      },
      orderBy: { lastMovedAt: "desc" },
    }),
    db.contact.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    db.user.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true },
    }),
    getWorkspacePipelineColumns(session.user.workspaceId),
    db.product.findMany({
      where: { workspaceId: session.user.workspaceId, deleted: false },
      select: { id: true, name: true, unitPrice: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PipelineKanban
      deals={deals.map((d) => ({
        id: d.id,
        title: d.title,
        value: Number(d.value),
        stage: d.stage,
        lastMovedAt: d.lastMovedAt.toISOString(),
        contact: d.contact
          ? {
              id: d.contact.id,
              name: `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim(),
              company: d.contact.company,
            }
          : null,
        assignedTo: d.assignedTo,
        lineItems: d.lineItems.map((li) => ({ productId: li.productId, quantity: li.quantity })),
      }))}
      contacts={contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      }))}
      users={users}
      columns={columns}
      products={products.map((p) => ({ id: p.id, name: p.name, unitPrice: Number(p.unitPrice) }))}
    />
  );
}
```

- [ ] **Step 2: Update `DealCard` type and `PipelineKanban` props in `kanban.tsx`**

Find:
```typescript
export type DealCard = {
  id: string;
  title: string;
  value: number;
  stage: string;
  lastMovedAt: string;
  contact: { id: string; name: string; company: string | null } | null;
  assignedTo: { id: string; name: string | null } | null;
};
```
Replace with:
```typescript
export type DealCard = {
  id: string;
  title: string;
  value: number;
  stage: string;
  lastMovedAt: string;
  contact: { id: string; name: string; company: string | null } | null;
  assignedTo: { id: string; name: string | null } | null;
  lineItems: { productId: string; quantity: number }[];
};
```

Find the `PipelineKanban` function signature:
```typescript
export function PipelineKanban({
  deals: initialDeals,
  contacts,
  users,
  columns: initialColumns,
}: {
  deals: DealCard[];
  contacts: { id: string; name: string }[];
  users: { id: string; name: string | null }[];
  columns: KanbanColumn[];
}) {
```
Replace with:
```typescript
export function PipelineKanban({
  deals: initialDeals,
  contacts,
  users,
  columns: initialColumns,
  products,
}: {
  deals: DealCard[];
  contacts: { id: string; name: string }[];
  users: { id: string; name: string | null }[];
  columns: KanbanColumn[];
  products: { id: string; name: string; unitPrice: number }[];
}) {
```

- [ ] **Step 3: Include `lineItems` in the form's initial state, `openAdd`, and `openEdit`**

Find:
```typescript
  const [formInitial, setFormInitial] = useState<DealFormValues>({
    title: "",
    value: "",
    stage: initialColumns[0]?.key ?? "LEAD",
    contactId: "",
    assignedToId: "",
  });
```
Replace with:
```typescript
  const [formInitial, setFormInitial] = useState<DealFormValues>({
    title: "",
    value: "",
    stage: initialColumns[0]?.key ?? "LEAD",
    contactId: "",
    assignedToId: "",
    lineItems: [],
  });
```

Find:
```typescript
  function openAdd(stage: string) {
    setFormInitial({ title: "", value: "", stage, contactId: "", assignedToId: "" });
    setSheetOpen(true);
  }

  function openEdit(deal: DealCard) {
    setFormInitial({
      id: deal.id,
      title: deal.title,
      value: String(deal.value),
      stage: deal.stage,
      contactId: deal.contact?.id ?? "",
      assignedToId: deal.assignedTo?.id ?? "",
    });
    setSheetOpen(true);
  }
```
Replace with:
```typescript
  function openAdd(stage: string) {
    setFormInitial({ title: "", value: "", stage, contactId: "", assignedToId: "", lineItems: [] });
    setSheetOpen(true);
  }

  function openEdit(deal: DealCard) {
    setFormInitial({
      id: deal.id,
      title: deal.title,
      value: String(deal.value),
      stage: deal.stage,
      contactId: deal.contact?.id ?? "",
      assignedToId: deal.assignedTo?.id ?? "",
      lineItems: deal.lineItems,
    });
    setSheetOpen(true);
  }
```

- [ ] **Step 4: Pass `products` to `<DealFormSheet>`**

Find:
```tsx
      <DealFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={formInitial}
        contacts={contacts}
        users={users}
        columns={columns}
      />
```
Replace with:
```tsx
      <DealFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={formInitial}
        contacts={contacts}
        users={users}
        columns={columns}
        products={products}
      />
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p .`
Expected: clean, zero errors across the whole project.

- [ ] **Step 6: Live verification**

With the dev server running (see Global Constraints on ports — use whichever `panelflo*` launch.json config isn't already occupied by the user, e.g. `panelflo-3003`), logged in as the test account:
1. Go to Stock, note a product's current quantity (add one via "Add product" if none exist).
2. Go to Pipeline, open a column's edit popover (pencil icon), check "Counts as sold", save. Confirm no other column still shows the checkbox checked when reopened.
3. Add a deal, attach that product with a quantity less than what's in stock, save. Drag the deal card into the won-flagged column.
4. Confirm: the product's Stock page quantity dropped by that amount, a `StockMovement`/Activity entry mentioning "Deal won: <title>" exists (visible via the product's context or the dashboard activity feed).
5. Drag the deal back to a non-won column. Confirm stock is restored to its original quantity, with a "Deal reopened" reason.
6. Create or edit a deal with a quantity greater than current stock, drag it into the won column. Confirm the move is rejected (card snaps back, matching the existing revert-on-error behavior) and the error message names the product and the shortfall.
7. Repeat steps 3-4 once in dark mode to confirm the new checkbox and product-picker rows are legible.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/pipeline/page.tsx" components/pipeline/kanban.tsx
git commit -m "feat(pipeline): wire products and line items through the kanban UI"
```
