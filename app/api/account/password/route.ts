import { compare, hash } from "bcryptjs";
import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

/** POST — change the current user's password */
export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!user.password) return fail("This account has no password set", 400);

  const valid = await compare(parsed.data.currentPassword, user.password);
  if (!valid) return fail("Current password is incorrect", 400);

  const newHash = await hash(parsed.data.newPassword, 12);
  await db.user.update({ where: { id: session.userId }, data: { password: newHash } });

  return ok({ updated: true });
}
