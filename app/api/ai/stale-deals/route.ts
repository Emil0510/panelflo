import { ok, requireN8nKey } from "@/lib/api";
import { db } from "@/lib/db";
import { complete } from "@/lib/openai";

const STALE_DAYS = 7;

/** Called by the n8n stale-deal cron — authenticated by x-api-key. */
export async function POST(req: Request) {
  const denied = requireN8nKey(req);
  if (denied) return denied;

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const deals = await db.deal.findMany({
    where: {
      lastMovedAt: { lt: cutoff },
      stage: { notIn: ["WON", "LOST"] },
    },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    take: 100,
  });

  const results = await Promise.all(
    deals.map(async (deal) => {
      const daysStale = Math.floor(
        (Date.now() - deal.lastMovedAt.getTime()) / (24 * 60 * 60 * 1000)
      );
      const contactName = deal.contact
        ? `${deal.contact.firstName} ${deal.contact.lastName ?? ""}`.trim()
        : "the customer";

      let suggestion = "Follow up with the customer";
      try {
        suggestion = await complete({
          system: "You suggest sales next actions. Reply with the action only.",
          user: `Deal "${deal.title}" with ${contactName} has been in ${deal.stage} stage for ${daysStale} days. Suggest one specific next action in 10 words max.`,
          maxTokens: 30,
        });
      } catch (err) {
        console.error("[ai] stale-deals suggestion failed:", err);
      }

      return {
        dealId: deal.id,
        dealTitle: deal.title,
        stage: deal.stage,
        daysStale,
        contactName,
        ownerId: deal.assignedTo?.id ?? null,
        suggestion,
      };
    })
  );

  return ok(results, { count: results.length });
}
