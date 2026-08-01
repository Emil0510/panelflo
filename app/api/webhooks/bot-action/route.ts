import { z } from "zod";

import { fail, ok, requireN8nKey } from "@/lib/api";
import { ACTIONS, executeBotAction, str, type BotUser } from "@/lib/bot-actions";
import { db } from "@/lib/db";
import { kv } from "@/lib/redis";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { sendButtons, sendMessage as sendWhatsappMessage } from "@/lib/whatsapp";

const schema = z.object({
  userId: z.string().min(1),
  platform: z.enum(["telegram", "whatsapp"]),
  action: z.enum(ACTIONS).catch("UNKNOWN"),
  data: z.record(z.string(), z.unknown()).default({}),
  reply: z.string().default(""),
  requiresConfirm: z.boolean().default(false),
});

type Payload = z.infer<typeof schema>;

async function sendReply(platform: Payload["platform"], chatId: string, text: string) {
  try {
    if (platform === "telegram") await sendTelegramMessage(chatId, text);
    else await sendWhatsappMessage(chatId, text);
  } catch (err) {
    console.error(`[bot-action] reply via ${platform} failed:`, err);
  }
}

export async function POST(req: Request) {
  const denied = requireN8nKey(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);
  const payload = parsed.data;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: {
      botSessions: {
        where: { platform: payload.platform.toUpperCase() as "TELEGRAM" | "WHATSAPP" },
      },
    },
  });
  if (!user) return fail("User not found", 404);

  const chatId = user.botSessions[0]?.chatId;
  if (!chatId) return fail("User has no bot session on this platform", 400);

  const botUser: BotUser = {
    id: user.id,
    workspaceId: user.workspaceId,
    role: user.role,
  };
  const pendingKey = `pending-action:${payload.platform}:${chatId}`;

  // Confirmation round-trip: stash the action, ask Yes/No, execute on Yes.
  if (payload.requiresConfirm && payload.action !== "UNKNOWN") {
    await kv.set(pendingKey, JSON.stringify(payload), { ex: 300 });
    const question = payload.reply || "Should I go ahead with that?";
    if (payload.platform === "whatsapp") {
      try {
        await sendButtons(chatId, question, [
          { id: "confirm_yes", title: "Yes" },
          { id: "confirm_no", title: "No" },
        ]);
      } catch {
        await sendReply("whatsapp", chatId, `${question} (reply Yes or No)`);
      }
    } else {
      await sendReply("telegram", chatId, `${question} (reply Yes or No)`);
    }
    return ok({ status: "awaiting-confirmation" });
  }

  // Yes/No replies resolve a pending action if one exists.
  const messageText = str(payload.data, "originalMessage")?.toLowerCase();
  if (messageText === "yes" || messageText === "no") {
    const pendingRaw = await kv.get<string>(pendingKey);
    if (pendingRaw) {
      await kv.del(pendingKey);
      if (messageText === "yes") {
        const pending = schema.parse(
          typeof pendingRaw === "string" ? JSON.parse(pendingRaw) : pendingRaw
        );
        const result = await executeBotAction(pending.action, pending.data, botUser);
        await sendReply(payload.platform, chatId, result ?? "Done ✅");
      } else {
        await sendReply(payload.platform, chatId, "Okay, cancelled.");
      }
      return ok({ status: "confirmed" });
    }
  }

  const result = await executeBotAction(payload.action, payload.data, botUser);
  const reply = result ?? payload.reply ?? "Done ✅";
  await sendReply(payload.platform, chatId, reply);

  return ok({ status: "executed", action: payload.action });
}
