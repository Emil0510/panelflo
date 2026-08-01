import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const dealSchema = z.object({
  title: z.string().min(1).max(200),
  value: z.number().min(0).optional(),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "WON", "LOST"]).optional(),
  contactId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");

  const deals = await db.deal.findMany({
    where: {
      workspaceId: session.workspaceId,
      ...(stage ? { stage: stage as "LEAD" | "CONTACTED" | "PROPOSAL" | "WON" | "LOST" } : {}),
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { lastMovedAt: "desc" },
  });

  return ok(deals, { count: deals.length });
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = dealSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const deal = await db.deal.create({
    data: {
      workspaceId: session.workspaceId,
      title: parsed.data.title,
      value: parsed.data.value ?? 0,
      stage: parsed.data.stage ?? "LEAD",
      contactId: parsed.data.contactId || null,
      assignedToId: parsed.data.assignedToId || null,
    },
  });

  return ok(deal);
}
