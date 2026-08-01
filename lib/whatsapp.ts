/** WhatsApp Cloud API helpers (Meta Graph API v18). */

const GRAPH_BASE = "https://graph.facebook.com/v18.0";

function config() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || token.includes("replace-me") || !phoneNumberId) {
    throw new Error("WhatsApp Cloud API is not configured");
  }
  return { token, phoneNumberId };
}

async function send(payload: Record<string, unknown>) {
  const { token, phoneNumberId } = config();
  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${body}`);
  }
  return res.json();
}

export function sendMessage(to: string, text: string) {
  return send({ to, type: "text", text: { body: text } });
}

export function sendList(to: string, header: string, items: string[]) {
  return send({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header.slice(0, 60) },
      body: { text: "Pick one:" },
      action: {
        button: "Open",
        sections: [
          {
            title: header.slice(0, 24),
            rows: items.slice(0, 10).map((item, i) => ({
              id: `item_${i}`,
              title: item.slice(0, 24),
              description: item.length > 24 ? item.slice(24, 96) : undefined,
            })),
          },
        ],
      },
    },
  });
}

export function sendButtons(
  to: string,
  text: string,
  buttons: { id: string; title: string }[]
) {
  return send({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}
