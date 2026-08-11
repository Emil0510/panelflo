# App Redesign (non-landing pages) — Design

## Goal

Redesign every page except `(marketing)` (landing + pricing, already redesigned in `c55f3f5`) to match its level of polish, using the existing design-token system rather than shadcn defaults.

## Scope

- **Auth shell**: `(auth)/login`, `(auth)/signup`, `(auth)/verify-email`, `/invite/[token]`
- **Dashboard shell**: `(dashboard)/layout.tsx` (sidebar, topbar, user menu) — shared by everything below
- **Core CRM**: `dashboard` (home/stats), `contacts` + `contacts/[id]`, `pipeline` (kanban)
- **Operational**: `tasks`, `stock`
- **Account**: `team`, `notifications`, `billing`, `settings`

## Current state

- `app/globals.css` already defines a full design-token system: light + dark palettes, brand green (`#2B5748` / `#9CB080`), status/priority badge colors, shadows, radii, transitions ("Soft UI Evolution"). This is solid — not being touched.
- `components/theme-toggle.tsx` and full light/dark support already exist.
- Full shadcn/ui primitive set already installed (`components/ui/*`).
- What's missing: shared page-level primitives. Every page currently hand-rolls its own header/empty-state/stat block, which is why pages read as generic shadcn rather than branded. Confirmed on `/login`: plain centered card, default spacing, no hierarchy, doesn't match the landing page's confidence.

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
