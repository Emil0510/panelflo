import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(60).optional(),
});

export async function PATCH(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;
  if (session.role !== "ADMIN") return fail("Only admins can update workspace settings", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const workspace = await db.workspace.update({
    where: { id: session.workspaceId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.timezone !== undefined ? { timezone: parsed.data.timezone } : {}),
    },
  });

  return ok({ name: workspace.name, timezone: workspace.timezone });
}
