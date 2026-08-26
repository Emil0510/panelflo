import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const disconnectSchema = z.object({
  platform: z.enum(["TELEGRAM", "WHATSAPP"]),
});

/** POST — disconnect a bot platform from the current user's account */
export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = disconnectSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  await db.botSession.deleteMany({
    where: { userId: session.userId, platform: parsed.data.platform },
  });

  return ok({ disconnected: true });
}
