import { webhookCallback } from "grammy";
import { NextResponse } from "next/server";

import { getTelegramBot } from "@/lib/telegram-bot";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const header = req.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Invalid secret token" }, { status: 401 });
  }

  try {
    const handler = webhookCallback(getTelegramBot(), "std/http");
    return await handler(req);
  } catch (err) {
    console.error("[telegram] webhook error:", err);
    // Always 200 so Telegram doesn't endlessly retry a poison update.
    return NextResponse.json({ ok: true });
  }
}
