import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { triggerN8n } from "@/lib/n8n";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  value: z.number().min(0).optional(),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "WON", "LOST"]).optional(),
  contactId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const deal = await db.deal.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
    include: { contact: true, assignedTo: true, tasks: { where: { deleted: false } } },
  });
  if (!deal) return fail("Deal not found", 404);
  return ok(deal);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.deal.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
    include: { contact: true },
  });
  if (!existing) return fail("Deal not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const stageChanged =
    parsed.data.stage !== undefined && parsed.data.stage !== existing.stage;

  const deal = await db.deal.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      contactId: parsed.data.contactId === "" ? null : parsed.data.contactId,
      assignedToId:
        parsed.data.assignedToId === "" ? null : parsed.data.assignedToId,
      ...(stageChanged ? { lastMovedAt: new Date() } : {}),
    },
  });

  if (stageChanged) {
    await db.activity.create({
      data: {
        workspaceId: session.workspaceId,
        contactId: existing.contactId,
        type: "DEAL_MOVED",
        content: `Deal "${existing.title}" moved from ${existing.stage} to ${deal.stage}`,
        createdById: session.userId,
      },
    });
    void triggerN8n({
      event: "deal-moved",
      dealId: deal.id,
      workspaceId: session.workspaceId,
      stage: deal.stage,
    });
  }

  return ok(deal);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.deal.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!existing) return fail("Deal not found", 404);

  await db.deal.delete({ where: { id: existing.id } });
  return ok({ deleted: true });
}
