import { isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

/** GET — list notifications for the current user */
export async function GET() {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const notifications = await db.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.read).length;
  return ok({ notifications, unread });
}

/** PATCH — mark all as read */
export async function PATCH() {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  await db.notification.updateMany({
    where: { userId: session.userId, read: false },
    data: { read: true },
  });

  return ok({ updated: true });
}

/** DELETE — clear all notifications */
export async function DELETE() {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  await db.notification.deleteMany({ where: { userId: session.userId } });
  return ok({ deleted: true });
}
