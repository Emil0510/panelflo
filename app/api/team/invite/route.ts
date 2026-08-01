import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { createInviteToken } from "@/lib/invite";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;
  if (session.role !== "ADMIN") return fail("Only admins can invite members", 403);

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const email = parsed.data.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return fail("A user with this email already exists", 409);

  const [inviter, workspace] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    db.workspace.findUnique({ where: { id: session.workspaceId } }),
  ]);
  if (!inviter || !workspace) return fail("Workspace not found", 404);

  const token = createInviteToken({
    email,
    workspaceId: workspace.id,
    role: parsed.data.role,
    invitedByName: inviter.name ?? inviter.email,
    workspaceName: workspace.name,
  });

  await sendInviteEmail({
    to: email,
    inviterName: inviter.name ?? inviter.email,
    workspaceName: workspace.name,
    token,
  });

  return ok({ invited: email });
}
