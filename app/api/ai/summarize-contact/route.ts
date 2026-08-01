import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { complete } from "@/lib/openai";
import { checkAiRateLimit } from "@/lib/ratelimit";

const schema = z.object({ contactId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const limit = await checkAiRateLimit(session.workspaceId);
  if (!limit.allowed) {
    return fail("AI rate limit reached (10 calls/hour). Try again later.", 429);
  }

  const contact = await db.contact.findFirst({
    where: { id: parsed.data.contactId, workspaceId: session.workspaceId },
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
      tasks: { where: { deleted: false, completed: false } },
      deals: true,
    },
  });
  if (!contact) return fail("Contact not found", 404);

  const context = [
    `Contact: ${contact.firstName} ${contact.lastName ?? ""} (${contact.status})`,
    contact.company ? `Company: ${contact.company}` : null,
    contact.notes ? `Notes: ${contact.notes}` : null,
    `Open tasks: ${contact.tasks.map((t) => t.title).join("; ") || "none"}`,
    `Deals: ${contact.deals.map((d) => `${d.title} [${d.stage}, $${d.value}]`).join("; ") || "none"}`,
    `Recent activity:`,
    ...contact.activities.map(
      (a) => `- ${a.createdAt.toISOString().slice(0, 10)} [${a.type}] ${a.content}`
    ),
  ]
    .filter(Boolean)
    .join("\n");

  let summary: string;
  try {
    summary = await complete({
      system:
        "Summarize this customer in 3 bullet points for a sales rep. " +
        "Focus on: current relationship status, last interaction, next action needed. " +
        "Be specific, not generic. Max 50 words total.",
      user: context,
      maxTokens: 150,
    });
  } catch (err) {
    console.error("[ai] summarize-contact failed:", err);
    return fail("AI service unavailable", 502);
  }

  return ok({ summary }, { remaining: limit.remaining });
}
