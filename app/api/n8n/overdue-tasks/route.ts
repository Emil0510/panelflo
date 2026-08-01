import { ok, requireN8nKey } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const denied = requireN8nKey(req);
  if (denied) return denied;

  const now = new Date();
  const tasks = await db.task.findMany({
    where: {
      deleted: false,
      completed: false,
      dueDate: { lt: now },
      assignedToId: { not: null },
    },
    include: {
      assignedTo: { include: { botSessions: true } },
    },
    orderBy: [{ assignedToId: "asc" }, { dueDate: "asc" }],
    take: 500,
  });

  const results = tasks.flatMap((task) => {
    const session = task.assignedTo?.botSessions[0];
    if (!session || !task.dueDate) return [];
    const daysOverdue = Math.floor(
      (now.getTime() - task.dueDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    return [
      {
        userId: task.assignedTo!.id,
        platform: session.platform.toLowerCase(),
        chatId: session.chatId,
        taskId: task.id,
        taskTitle: task.title,
        daysOverdue,
      },
    ];
  });

  return ok(results, { count: results.length });
}
