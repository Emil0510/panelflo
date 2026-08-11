# App Redesign (final scope) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 5 real design gaps found by reading the actual page/component code (not just screenshots) — a shared empty-state primitive, apply it to the two genuinely bare tables, a light icon touch on pipeline's empty column and settings' cards, and a real dark-mode bug fix on the invite page.

**Architecture:** One new presentational component (`EmptyState`), consumed by two existing table components. Three small in-place JSX edits (pipeline column empty state, settings card icons, invite page background token). No data-fetching, API, routing, or Prisma changes anywhere.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind (existing `app/globals.css` tokens), lucide-react icons, no new dependencies.

## Global Constraints

- No new npm dependencies.
- No changes to data-fetching, API routes, or Prisma schema.
- Use only existing design tokens from `app/globals.css` (`bg-card`, `text-muted-foreground`, `bg-muted`, etc.) — never hardcode colors like `bg-white`.
- Verify every change by loading the affected page at `http://localhost:3001` (dev server already running on port 3001) in both light and dark mode.

---

### Task 1: Shared `EmptyState` component

**Files:**
- Create: `components/empty-state.tsx`

**Interfaces:**
- Produces: `EmptyState({ icon: LucideIcon, title: string, description?: string, className?: string })` — a default export is NOT used, it's a named export `EmptyState`. Tasks 2 and 3 import `{ EmptyState } from "@/components/empty-state"`.

- [ ] **Step 1: Create the component**

```tsx
import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no new errors referencing `components/empty-state.tsx` (pre-existing unrelated errors, if any, are not this task's concern).

- [ ] **Step 3: Commit**

```bash
git add components/empty-state.tsx
git commit -m "feat(ui): add shared EmptyState component"
```

---

### Task 2: Apply `EmptyState` to the contacts table

**Files:**
- Modify: `components/contacts/contacts-table.tsx:1-20` (imports), `:176-182` (empty-row JSX)

**Interfaces:**
- Consumes: `EmptyState` from Task 1 (`components/empty-state.tsx`).

- [ ] **Step 1: Add imports**

At the top of `components/contacts/contacts-table.tsx`, alongside the existing `lucide-react` import, add `Users` to the icon import and import `EmptyState`:

```tsx
import { ArrowUpDown, Plus, Users } from "lucide-react";
```

(replaces the existing `import { ArrowUpDown, Plus } from "lucide-react";` line)

Add a new import line near the other `@/components` imports:

```tsx
import { EmptyState } from "@/components/empty-state";
```

- [ ] **Step 2: Replace the empty-state row**

Find this block (currently lines ~177-182):

```tsx
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted-foreground">
                  No contacts found. Add your first contact to get started.
                </td>
              </tr>
            ) : (
```

Replace with:

```tsx
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    icon={Users}
                    title={contacts.length === 0 ? "No contacts yet" : "No contacts match your filters"}
                    description={
                      contacts.length === 0
                        ? "Add your first contact to start building your CRM."
                        : "Try adjusting your search or filters."
                    }
                  />
                </td>
              </tr>
            ) : (
```

- [ ] **Step 3: Verify live**

With the dev server running on port 3001, load `http://localhost:3001/contacts` while logged in with zero contacts. Confirm the empty state shows a circular muted icon badge with "No contacts yet" and the description, in both light and dark mode (toggle via the theme toggle in the topbar). Also verify: typing a search term that matches nothing shows "No contacts match your filters" instead.

- [ ] **Step 4: Commit**

```bash
git add components/contacts/contacts-table.tsx
git commit -m "feat(contacts): use shared EmptyState for empty table"
```

---

### Task 3: Apply `EmptyState` to the stock table

**Files:**
- Modify: `components/stock/stock-table.tsx:1-12` (imports), `:194-205` (empty-row JSX)

**Interfaces:**
- Consumes: `EmptyState` from Task 1.

- [ ] **Step 1: Add the import**

Add alongside the other `@/components` imports in `components/stock/stock-table.tsx`:

```tsx
import { EmptyState } from "@/components/empty-state";
```

(`Package` is already imported from `lucide-react` in this file — reuse it, no icon-import change needed.)

- [ ] **Step 2: Replace the empty-state row**

Find this block (currently lines ~195-205):

```tsx
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  {products.length === 0
                    ? "No products yet. Add your first product to start tracking stock."
                    : "No products match the current filter."}
                </td>
              </tr>
            ) : (
```

Replace with:

```tsx
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-0">
                  <EmptyState
                    icon={Package}
                    title={products.length === 0 ? "No products yet" : "No products match your filters"}
                    description={
                      products.length === 0
                        ? "Add your first product to start tracking stock."
                        : "Try adjusting your search or filters."
                    }
                  />
                </td>
              </tr>
            ) : (
```

- [ ] **Step 3: Verify live**

Load `http://localhost:3001/stock` while logged in with zero products. Confirm the same circular-icon empty state as contacts, in both light and dark mode. Add a product, then use "Low stock only" filter to hide it, and confirm the filtered-empty message reads "No products match your filters".

- [ ] **Step 4: Commit**

```bash
git add components/stock/stock-table.tsx
git commit -m "feat(stock): use shared EmptyState for empty table"
```

---

### Task 4: Light icon touch on pipeline's empty column + settings card icons

**Files:**
- Modify: `components/pipeline/kanban.tsx:1-24` (imports), `:264-266` (empty-column JSX)
- Modify: `app/(dashboard)/settings/page.tsx:1-8` (imports), `:29-31`, `:58-60`, `:87-89` (three `CardTitle`s)

**Interfaces:**
- None (self-contained JSX-only changes, no new shared component — the column is too narrow, `w-64`, for the full `EmptyState`).

- [ ] **Step 1: Pipeline — add `Inbox` to the icon import**

In `components/pipeline/kanban.tsx`, the existing import is:

```tsx
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
```

Change to:

```tsx
import { ChevronDown, ChevronRight, Inbox, Pencil, Plus, Trash2, X } from "lucide-react";
```

- [ ] **Step 2: Pipeline — replace the empty-column text**

Find (inside `StageColumn`, currently lines ~264-266):

```tsx
          {deals.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">No deals</p>
          )}
```

Replace with:

```tsx
          {deals.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center">
              <Inbox className="h-4 w-4 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No deals</p>
            </div>
          )}
```

- [ ] **Step 3: Pipeline — verify live**

Load `http://localhost:3001/pipeline`. Confirm every column with zero deals shows a small inbox icon above "No deals", in both light and dark mode.

- [ ] **Step 4: Settings — add icon imports**

In `app/(dashboard)/settings/page.tsx`, the existing import is:

```tsx
import { Check, Minus } from "lucide-react";
```

Change to:

```tsx
import { Bot, Building2, Check, Minus, User } from "lucide-react";
```

- [ ] **Step 5: Settings — add icons to the three `CardTitle`s**

Find (currently lines ~29-31):

```tsx
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
```

Replace with:

```tsx
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Workspace
          </CardTitle>
        </CardHeader>
```

Find (currently lines ~58-60):

```tsx
        <CardHeader>
          <CardTitle className="text-base">Bot connections</CardTitle>
        </CardHeader>
```

Replace with:

```tsx
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-muted-foreground" />
            Bot connections
          </CardTitle>
        </CardHeader>
```

Find (currently lines ~87-89):

```tsx
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
```

Replace with:

```tsx
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Account
          </CardTitle>
        </CardHeader>
```

- [ ] **Step 6: Settings — verify live**

Load `http://localhost:3001/settings`. Confirm each of the three card titles now has a small muted icon before the label, in both light and dark mode.

- [ ] **Step 7: Commit**

```bash
git add components/pipeline/kanban.tsx "app/(dashboard)/settings/page.tsx"
git commit -m "feat(ui): icon touches on pipeline empty column and settings cards"
```

---

### Task 5: Fix invite page dark-mode bug

**Files:**
- Modify: `app/invite/[token]/page.tsx:17`

**Interfaces:**
- None.

- [ ] **Step 1: Fix the hardcoded background**

Find (currently line 17):

```tsx
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-white p-8 text-center shadow-sm">
```

Replace with:

```tsx
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm">
```

- [ ] **Step 2: Verify live in dark mode specifically**

Signed-in users skip this page, so test unauthenticated: load `http://localhost:3001/invite/invalid-token-test` (any token — both the "expired" and valid-invite branches share this card). Switch to dark mode (the invite page has no theme toggle of its own — use the OS/browser dark mode preference, or `resize_window`'s `colorScheme` param if using the Claude_Browser preview tools) and confirm the card background is now the dark card token color, not white-on-dark.

- [ ] **Step 3: Commit**

```bash
git add "app/invite/[token]/page.tsx"
git commit -m "fix(invite): replace hardcoded bg-white with bg-card token for dark-mode support"
```
