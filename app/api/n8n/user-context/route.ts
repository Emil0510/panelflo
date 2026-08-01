import { fail, ok, requireN8nKey } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const denied = requireN8nKey(req);
  if (denied) return denied;

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return fail("userId is required", 400);

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return fail("User not found", 404);

  const [recentContacts, openTasks, openDeals] = await Promise.all([
    db.contact.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        status: true,
      },
    }),
    db.task.findMany({
      where: { workspaceId: user.workspaceId, deleted: false, completed: false },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: { id: true, title: true, dueDate: true },
    }),
    db.deal.findMany({
      where: { workspaceId: user.workspaceId, stage: { notIn: ["WON", "LOST"] } },
      orderBy: { lastMovedAt: "desc" },
      take: 3,
      select: { id: true, title: true, stage: true, value: true },
    }),
  ]);

  return ok({ recentContacts, openTasks, openDeals });
}
