import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

/** PATCH — mark one notification as read/unread */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const read = typeof body.read === "boolean" ? body.read : true;

  const notif = await db.notification.findFirst({
    where: { id: params.id, userId: session.userId },
  });
  if (!notif) return fail("Not found", 404);

  await db.notification.update({ where: { id: params.id }, data: { read } });
  return ok({ updated: true });
}

/** DELETE — delete one notification */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  await db.notification.deleteMany({
    where: { id: params.id, userId: session.userId },
  });
  return ok({ deleted: true });
}
