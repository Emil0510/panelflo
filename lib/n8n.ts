/**
 * Fire-and-forget triggers to n8n webhook workflows. Failures are logged,
 * never block the API response.
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
    };

export async function triggerN8n(event: N8nEvent): Promise<void> {
  const base = process.env.N8N_WEBHOOK_URL;
  if (!base || base.includes("your-n8n")) {
    console.warn(`[n8n] N8N_WEBHOOK_URL not configured — skipped ${event.event}`);
    return;
  }

  const path =
    event.event === "bot-message" ? "/webhook/bot-message" : `/webhook/${event.event}`;

  try {
    await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error(`[n8n] trigger ${event.event} failed:`, err);
  }
}
