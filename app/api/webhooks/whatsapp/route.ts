import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { triggerN8n } from "@/lib/n8n";
import { sendMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Meta webhook verification handshake. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

type WhatsAppMessage = {
  from: string;
  type: string;
  text?: { body: string };
  interactive?: {
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const messages: WhatsAppMessage[] =
    body?.entry?.flatMap(
      (entry: { changes?: { value?: { messages?: WhatsAppMessage[] } }[] }) =>
        entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []
    ) ?? [];

  for (const message of messages) {
    const from = message.from; // phone number without '+'
    const text =
      message.text?.body ??
      message.interactive?.button_reply?.title ??
      message.interactive?.list_reply?.title;
    if (!from || !text) continue;

    const session = await db.botSession.findFirst({
      where: { platform: "WHATSAPP", chatId: from },
      include: { user: true },
    });

    if (!session) {
      try {
        await sendMessage(
          from,
          "Hi, I'm Flo from Panelflo 🌿 — this number isn't linked yet. " +
            "Connect it from your Panelflo dashboard → Connect Bot → WhatsApp."
        );
      } catch (err) {
        console.error("[whatsapp] send failed:", err);
      }
      continue;
    }

    await db.botSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    await triggerN8n({
      event: "bot-message",
      userId: session.userId,
      platform: "whatsapp",
      chatId: from,
      message: text,
      workspaceId: session.user.workspaceId,
    });
  }

  // Meta requires a fast 200 regardless of processing outcome.
  return NextResponse.json({ received: true });
}
