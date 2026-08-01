import { ok, requireN8nKey } from "@/lib/api";
import { db } from "@/lib/db";

const STALE_DAYS = 7;

export async function GET(req: Request) {
  const denied = requireN8nKey(req);
  if (denied) return denied;

  const now = Date.now();
  const cutoff = new Date(now - STALE_DAYS * 24 * 60 * 60 * 1000);

  const deals = await db.deal.findMany({
    where: {
      lastMovedAt: { lt: cutoff },
      stage: { notIn: ["WON", "LOST"] },
      assignedToId: { not: null },
    },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      assignedTo: { include: { botSessions: true } },
    },
    take: 200,
  });

  const results = deals.flatMap((deal) => {
    const session = deal.assignedTo?.botSessions[0];
    if (!session) return [];
    return [
      {
        ownerId: deal.assignedTo!.id,
        platform: session.platform.toLowerCase(),
        chatId: session.chatId,
        dealId: deal.id,
        dealTitle: deal.title,
        stage: deal.stage,
        daysStale: Math.floor(
          (now - deal.lastMovedAt.getTime()) / (24 * 60 * 60 * 1000)
        ),
        contactName: deal.contact
          ? `${deal.contact.firstName} ${deal.contact.lastName ?? ""}`.trim()
          : null,
      },
    ];
  });

  return ok(results, { count: results.length });
}
