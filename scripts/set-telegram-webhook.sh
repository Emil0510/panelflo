#!/usr/bin/env bash
# Registers the Telegram webhook for @panelflo_bot.
# Usage: TELEGRAM_BOT_TOKEN=xxx TELEGRAM_WEBHOOK_SECRET=yyy ./scripts/set-telegram-webhook.sh https://panelflo.com
set -euo pipefail

BASE_URL="${1:?Usage: set-telegram-webhook.sh <base-url>}"
: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN must be set}"
: "${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET must be set}"

curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "{\"url\": \"${BASE_URL}/api/webhooks/telegram\", \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\"}"
echo
