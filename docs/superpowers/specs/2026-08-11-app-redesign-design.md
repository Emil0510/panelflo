# App Redesign (non-landing pages) — Design

## Goal

Redesign every page except `(marketing)` (landing + pricing, already redesigned in `c55f3f5`) to match its level of polish, using the existing design-token system rather than shadcn defaults.

## Scope

- **Auth shell**: `(auth)/login`, `(auth)/signup`, `(auth)/verify-email`, `/invite/[token]`
- **Dashboard shell**: `(dashboard)/layout.tsx` (sidebar, topbar, user menu) — shared by everything below
- **Core CRM**: `dashboard` (home/stats), `contacts` + `contacts/[id]`, `pipeline` (kanban)
- **Operational**: `tasks`, `stock`
- **Account**: `team`, `notifications`, `billing`, `settings`

## Current state (corrected after live verification)

- `app/globals.css` already defines a full design-token system: light + dark palettes, brand green (`#2B5748` / `#9CB080`), status/priority badge colors, shadows, radii, transitions ("Soft UI Evolution"). This is solid — not being touched.
- `components/theme-toggle.tsx` and full light/dark support already exist.
- Full shadcn/ui primitive set already installed (`components/ui/*`).
- **Correction:** an earlier pass of this spec claimed `/login` was plain/generic. That was tested at a 710px viewport, which hides the desktop branded panel (`hidden lg:flex`) by design. At proper desktop width, verified live (signed in with a test account) that the following are already well-designed and do NOT need a rework: `(auth)/layout.tsx` + login/signup (branded gradient split-panel, feature checklist, clean form), the dashboard shell (`(dashboard)/layout.tsx`, `sidebar-nav.tsx`, `topbar.tsx`, `user-menu.tsx` — proper nav sections/active states/search/notification bell/theme toggle/plan badge), and the dashboard home page (stat cards, iconed empty states like "You're all caught up today 🎉").
- Verified live (full page-by-page pass, all 11 dashboard/auth/invite routes) with a real test account. Also already well-designed, no rework needed: `notifications` (proper icon + bold title + subtitle empty state) and `billing` (polished pricing cards with "Popular" badge, current-plan summary).
- Confirmed genuinely bare: `contacts` (plain table, bare "No contacts found..." text row, no icon/card treatment), `pipeline` (kanban columns with plain "No deals" text, sparse layout, dead space), `stock` (same bare-table pattern as contacts), `team` (bare table, minimal), `settings` (plain unstyled cards, no icons/hierarchy), `tasks` (plain list/board, no card wrapper, though it does have one emoji touch in its empty state). `invite/[token]/page.tsx` hardcodes `bg-white` in its card — directly violates the documented dark-mode rule ("never use bg-white/bg-slate-50/bg-gray-50") from the knowledge-base dev notes, and doesn't use the shared auth branded-panel layout at all (custom centered-card layout instead).
- What's missing project-wide: shared page-level primitives (`PageHeader`, `StatCard`, `EmptyState`). Even the polished pages don't use shared components for these — each hand-rolls its own markup, which is why the bare pages in particular fall back to default/minimal treatment.

## Differentiated depth (per user direction: still touch every page, but proportional to actual need)

- **Light consistency pass** (small, low-risk tweaks only — these are already good): auth shell (login/signup/verify-email), dashboard shell, dashboard home, notifications, billing. No structural rework.
- **Full UX pass** (real work): contacts (list + detail), pipeline, tasks, stock, team, settings, invite. Apply the shared primitives, fix empty states, improve hierarchy/spacing/table treatment, and for `invite` specifically: fix the `bg-white` dark-mode violation and align it to the branded auth-panel pattern.

## Approach

Extend, don't rearchitect:
- No changes to data-fetching (server components + Prisma), API routes, Prisma schema, or routing.
- No new npm dependencies.
- Touch presentational JSX/className in page/layout files, plus a small set of new shared UI primitives.
- Full UX pass allowed (layout can change, not just color/spacing) per user direction — apply ui-ux-pro-max guidance for hierarchy, empty states, spacing rhythm, table/kanban treatment.
- Both light and dark themes get polished; light stays default.

### New shared primitives (build once, reuse everywhere)

- `components/page-header.tsx` — title, optional description, optional action slot (button/menu). Used at the top of every dashboard page.
- `components/stat-card.tsx` — label, value, optional delta/icon. Used on the dashboard home and wherever summary numbers appear (billing, stock).
- `components/empty-state.tsx` — icon, message, optional CTA. Used wherever a list/table/board can be empty (contacts, tasks, stock, team, notifications).

Existing `components/ui/table.tsx`, `kanban.tsx`, `task-board.tsx`, etc. get restyled in place — no new table/kanban abstraction, just better use of the token system (spacing, row hover, badge treatment, empty states via the new `EmptyState`).

## Build order

1. Auth shell (login, signup, verify-email, invite) — small, self-contained, establishes the branded-form pattern.
2. Dashboard shell (`(dashboard)/layout.tsx`, `sidebar-nav.tsx`, `topbar.tsx`, `user-menu.tsx`) — wraps every page below, so it goes first.
3. Shared primitives (`page-header`, `stat-card`, `empty-state`).
4. Core CRM: dashboard home, contacts (list + detail), pipeline.
5. Operational: tasks, stock.
6. Account: team, notifications, billing, settings.

## Non-goals

- No changes to `(marketing)` landing or pricing pages.
- No new routes or pages.
- No backend/API/schema changes.
- No new dependencies.

## Verification

After each build-order batch, load the affected page(s) in the running dev server (localhost:3001) and screenshot in both light and dark mode to confirm against the design tokens and check for regressions (broken layout, unreadable contrast, overflow).
