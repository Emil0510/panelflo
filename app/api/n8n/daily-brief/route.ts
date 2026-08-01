import { fail, ok, requireN8nKey } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const denied = requireN8nKey(req);
  if (denied) return denied;

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return fail("userId is required", 400);

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return fail("User not found", 404);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [tasksDueToday, overdueCount, topDeal] = await Promise.all([
    db.task.findMany({
      where: {
        assignedToId: userId,
        deleted: false,
        completed: false,
        dueDate: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { dueDate: "asc" },
      select: { id: true, title: true, dueDate: true },
    }),
    db.task.count({
      where: {
        assignedToId: userId,
        deleted: false,
        completed: false,
        dueDate: { lt: startOfDay },
      },
    }),
    db.deal.findFirst({
      where: { workspaceId: user.workspaceId, stage: { notIn: ["WON", "LOST"] } },
      orderBy: { value: "desc" },
      select: { id: true, title: true, value: true, stage: true },
    }),
  ]);

  return ok({
    tasksDueToday,
    overdueCount,
    topDeal: topDeal ? { ...topDeal, value: Number(topDeal.value) } : null,
  });
}
