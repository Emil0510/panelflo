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
    },
  });
  if (!contact) return fail("Contact not found", 404);

  const context = [
    `Contact: ${contact.firstName} ${contact.lastName ?? ""} (${contact.status})`,
    `Open tasks: ${contact.tasks.map((t) => t.title).join("; ") || "none"}`,
    `History:`,
    ...contact.activities.map(
      (a) => `- ${a.createdAt.toISOString().slice(0, 10)} [${a.type}] ${a.content}`
    ),
  ].join("\n");

  let suggestion: string;
  try {
    suggestion = await complete({
      system:
        "Based on this customer history, what is the single most important " +
        "next action? Return as a task title only. Max 10 words.",
      user: context,
      maxTokens: 40,
    });
  } catch (err) {
    console.error("[ai] suggest-task failed:", err);
    return fail("AI service unavailable", 502);
  }

  return ok({ suggestion }, { remaining: limit.remaining });
}
