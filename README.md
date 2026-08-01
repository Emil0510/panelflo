# Panelflo

Business admin panel with two interfaces — a Next.js web dashboard and a
Telegram/WhatsApp bot ("Flo") — sharing one database. AI features run through
n8n workflows that connect OpenAI to both interfaces.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind + shadcn/ui |
| Auth | NextAuth.js (credentials, JWT) |
| Database | PostgreSQL (Supabase) via Prisma 6 |
| Payments | Stripe subscriptions ($29 / $59 / $99) |
| AI workflows | n8n (self-hosted, Railway) + GPT-4o mini |
| Telegram bot | Grammy.js — `@panelflo_bot` |
| WhatsApp bot | Meta Cloud API |
| Rate limiting / bot sessions | Upstash Redis |
| Email | Resend |

## Local development

```bash
npm install
cp .env.example .env.local        # fill in real values
npx prisma migrate dev --name init  # needs a reachable DATABASE_URL
npx tsx scripts/seed.ts             # optional demo data (demo@panelflo.com / password123)
npm run dev
```

Without Upstash credentials, Redis falls back to in-memory (dev only).
Without `RESEND_API_KEY`, invite links are logged to the console instead of
emailed.

## Project layout

```
app/(auth)/        login, signup, verify-email
app/(dashboard)/   protected routes: home, contacts, pipeline, tasks, team, settings, billing
app/api/           CRUD APIs, AI routes, Stripe, bot webhooks, n8n support endpoints
app/invite/[token] invite acceptance page
components/        UI components (shadcn in components/ui)
lib/               db, auth, stripe, openai, redis, telegram-bot, whatsapp, n8n client
prisma/            schema.prisma + init.sql (generated migration script)
n8n-workflows/     5 importable workflow JSON exports
scripts/           seed.ts, set-telegram-webhook.sh
```

## API authentication

- Dashboard APIs: NextAuth session, scoped to the user's `workspaceId`.
- `/api/n8n/*` and `/api/webhooks/bot-action`: `x-api-key` header must equal `N8N_API_KEY`.
- `/api/webhooks/telegram`: `X-Telegram-Bot-Api-Secret-Token` must equal `TELEGRAM_WEBHOOK_SECRET`.
- `/api/webhooks/whatsapp`: Meta verify-token handshake on GET.
- `/api/stripe/webhook`: Stripe signature verification.

## Deployment

### 1. Vercel (frontend)

1. Connect the GitHub repo to Vercel.
2. Set all environment variables from `.env.example` in the Vercel dashboard.
3. `vercel.json` already sets `maxDuration: 30` for API routes.
4. Add the production domain `panelflo.com` under Settings → Domains.

### 2. Supabase (database)

1. Create a project at supabase.com, copy the connection string into `DATABASE_URL`.
2. Run `npx prisma migrate deploy` (or apply `prisma/init.sql` directly).
3. Enable Row Level Security on all tables as extra protection (the app
   already scopes every query by `workspaceId`).

### 3. Railway (n8n)

1. Deploy n8n from the Railway template.
2. Set env vars: `N8N_BASIC_AUTH_ACTIVE=true`, `N8N_BASIC_AUTH_USER`,
   `N8N_BASIC_AUTH_PASSWORD`, `OPENAI_API_KEY`, `PANELFLO_API_URL`,
   `PANELFLO_API_KEY`, `TELEGRAM_BOT_TOKEN`, `WHATSAPP_TOKEN`,
   `WHATSAPP_PHONE_NUMBER_ID`.
3. Import the 5 JSON files from `n8n-workflows/` and activate them.
4. Copy the intent-detection webhook base URL into `N8N_WEBHOOK_URL` on Vercel.

### 4. Telegram webhook

```bash
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_WEBHOOK_SECRET=yyy \
  ./scripts/set-telegram-webhook.sh https://panelflo.com
```

### 5. WhatsApp webhook

Meta Developer Console → WhatsApp → Configuration:
- Webhook URL: `https://panelflo.com/api/webhooks/whatsapp`
- Verify token: value of `WHATSAPP_VERIFY_TOKEN`
- Subscribe to: `messages`

## n8n workflows

| Workflow | Trigger | What it does |
|---|---|---|
| panelflo-intent-detection | Webhook `/webhook/bot-message` | Classifies bot messages with GPT-4o mini, posts action to `/api/webhooks/bot-action` |
| panelflo-morning-digest | Cron `0 9 * * 1-6` | Sends each connected user their daily brief |
| panelflo-overdue-alerts | Cron `0 10 * * *` | Pings assignees about overdue tasks |
| panelflo-stale-deals | Cron `0 11 * * 1` | AI-suggested next action for deals stuck 7+ days |
| panelflo-weekly-summary | Cron `0 8 * * 1` | Weekly stats recap to workspace admins |
