import { randomInt } from "crypto";

import { isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { kv } from "@/lib/redis";

const CODE_TTL_SECONDS = 5 * 60;

/** Generate a 6-digit one-time code for linking Telegram. */
export async function POST() {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const code = String(randomInt(100000, 1000000));
  await kv.set(`tg-connect:${code}`, session.userId, { ex: CODE_TTL_SECONDS });

  return ok({ code, expiresIn: CODE_TTL_SECONDS });
}
