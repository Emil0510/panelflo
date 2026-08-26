import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
});

/** PATCH — update the current user's own display name */
export async function PATCH(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const user = await db.user.update({
    where: { id: session.userId },
    data: { name: parsed.data.name },
  });

  return ok({ name: user.name });
}
