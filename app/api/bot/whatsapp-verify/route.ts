import { randomInt } from "crypto";
import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { kv } from "@/lib/redis";
import { sendMessage } from "@/lib/whatsapp";

const CODE_TTL_SECONDS = 10 * 60;

const phoneSchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, "Enter a valid phone number with country code"),
});

const confirmSchema = phoneSchema.extend({
  code: z.string().length(6),
});

function normalize(phone: string) {
  return phone.replace(/^\+/, "");
}

/** Step 1 — send a verification code to the user's WhatsApp. */
export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = phoneSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const phone = normalize(parsed.data.phone);
  const code = String(randomInt(100000, 1000000));
  await kv.set(`wa-verify:${session.userId}:${phone}`, code, {
    ex: CODE_TTL_SECONDS,
  });

  try {
    await sendMessage(
      phone,
      `Your Panelflo verification code is ${code}. It expires in 10 minutes.`
    );
  } catch (err) {
    console.error("[whatsapp] verify send failed:", err);
    if (err instanceof Error && err.message.includes("not configured")) {
      return fail(
        "WhatsApp is not set up yet — add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID to the server environment",
        503
      );
    }
    return fail("Could not send WhatsApp message — check the number", 502);
  }

  return ok({ sent: true });
}

/** Step 2 — confirm the code and link the number. */
export async function PUT(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const phone = normalize(parsed.data.phone);
  const key = `wa-verify:${session.userId}:${phone}`;
  const expected = await kv.get<string>(key);

  if (!expected || String(expected) !== parsed.data.code) {
    return fail("Invalid or expired code", 400);
  }
  await kv.del(key);

  await db.$transaction([
    db.botSession.upsert({
      where: {
        userId_platform: { userId: session.userId, platform: "WHATSAPP" },
      },
      create: { userId: session.userId, platform: "WHATSAPP", chatId: phone },
      update: { chatId: phone, lastActivity: new Date() },
    }),
    db.user.update({
      where: { id: session.userId },
      data: { whatsappNumber: phone },
    }),
  ]);

  try {
    await sendMessage(phone, "Connected! You're now linked to Panelflo. Say hi! 👋");
  } catch (err) {
    console.error("[whatsapp] welcome send failed:", err);
  }

  return ok({ connected: true });
}
