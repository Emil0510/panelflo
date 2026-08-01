import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;
  if (session.role !== "ADMIN") return fail("Only admins can remove members", 403);
  if (params.id === session.userId) return fail("You cannot remove yourself", 400);

  const member = await db.user.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!member) return fail("Member not found", 404);

  await db.user.delete({ where: { id: member.id } });
  return ok({ removed: true });
}
