/**
 * Fire-and-forget triggers to the Panelflo bot service (Modal-hosted Python
 * app — see ../bot-service). Failures are logged, never block the API
 * response.
 *
 * Was previously n8n (N8N_WEBHOOK_URL); replaced 2026-09-08. Only
 * "bot-message" is actually consumed today — the bot service exposes a
 * single POST /webhook/bot-message route.
 */

type N8nEvent =
  | { event: "deal-moved"; dealId: string; workspaceId: string; stage: string }
  | { event: "task-completed"; taskId: string; workspaceId: string }
  | {
      event: "bot-message";
      userId: string;
      platform: "telegram" | "whatsapp";
      chatId: string;
      message: string;
      workspaceId: string;
      /** Base64 audio for a voice message — the bot service transcribes and acts on it. */
      audioBase64?: string;
      audioMimeType?: string;
    };

export async function triggerN8n(event: N8nEvent): Promise<void> {
  const base = process.env.BOT_SERVICE_URL;
  const key = process.env.BOT_SERVICE_KEY;
  if (!base || !key) {
    console.warn(`[bot-service] BOT_SERVICE_URL/BOT_SERVICE_KEY not configured — skipped ${event.event}`);
    return;
  }

  const path =
    event.event === "bot-message" ? "/webhook/bot-message" : `/webhook/${event.event}`;

  try {
    await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error(`[bot-service] trigger ${event.event} failed:`, err);
  }
}
