import { fail, ok, requireN8nKey } from "@/lib/api";
import { db } from "@/lib/db";

const STALE_DAYS = 7;

export async function GET(req: Request) {
  const denied = requireN8nKey(req);
  if (denied) return denied;

  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) return fail("workspaceId is required", 400);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const [tasksCompleted, tasksCreated, wonDeals, newContacts, staleDealsCount] =
    await Promise.all([
      db.task.count({
        where: { workspaceId, completedAt: { gte: weekAgo } },
      }),
      db.task.count({
        where: { workspaceId, createdAt: { gte: weekAgo }, deleted: false },
      }),
      db.deal.findMany({
        where: { workspaceId, stage: "WON", lastMovedAt: { gte: weekAgo } },
        select: { value: true },
      }),
      db.contact.count({
        where: { workspaceId, createdAt: { gte: weekAgo } },
      }),
      db.deal.count({
        where: {
          workspaceId,
          lastMovedAt: { lt: staleCutoff },
          stage: { notIn: ["WON", "LOST"] },
        },
      }),
    ]);

  return ok({
    tasksCompleted,
    tasksCreated,
    dealsWon: wonDeals.length,
    dealsWonValue: wonDeals.reduce((sum, d) => sum + Number(d.value), 0),
    newContacts,
    staleDealsCount,
  });
}
