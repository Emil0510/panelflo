import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { getWorkspacePipelineColumns } from "@/lib/columns";
import { applyStockForWonTransition, StockError } from "@/lib/deals";
import { db } from "@/lib/db";
import { triggerN8n } from "@/lib/n8n";
import { notifyIfLowStockCrossed } from "@/lib/stock";

const lineItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  value: z.number().min(0).optional(),
  stage: z.string().min(1).max(50).optional(),
  contactId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const deal = await db.deal.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
    include: {
      contact: true,
      assignedTo: true,
      tasks: { where: { deleted: false } },
      lineItems: { include: { product: { select: { id: true, name: true } } } },
    },
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
    include: { contact: true, lineItems: true },
  });
  if (!existing) return fail("Deal not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const stageChanged =
    parsed.data.stage !== undefined && parsed.data.stage !== existing.stage;

  let wonBefore = false;
  let wonAfter = false;
  if (stageChanged) {
    const cols = await getWorkspacePipelineColumns(session.workspaceId);
    wonBefore = cols.find((c) => c.key === existing.stage)?.isWonStage ?? false;
    wonAfter = cols.find((c) => c.key === parsed.data.stage)?.isWonStage ?? false;
  }

  const effectiveLineItems = parsed.data.lineItems
    ? parsed.data.lineItems
    : existing.lineItems.map((li) => ({ productId: li.productId, quantity: li.quantity }));

  try {
    const [deal, notifyPairs] = await db.$transaction(async (tx) => {
      if (parsed.data.lineItems) {
        await tx.dealLineItem.deleteMany({ where: { dealId: existing.id } });
        for (const li of parsed.data.lineItems) {
          const product = await tx.product.findFirst({
            where: { id: li.productId, workspaceId: session.workspaceId },
          });
          if (!product) throw new StockError("One of the selected products no longer exists");
          await tx.dealLineItem.create({
            data: {
              dealId: existing.id,
              productId: li.productId,
              quantity: li.quantity,
              unitPriceAtSale: product.unitPrice,
            },
          });
        }
      }

      const updated = await tx.deal.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
          ...(parsed.data.value !== undefined ? { value: parsed.data.value } : {}),
          ...(parsed.data.stage !== undefined ? { stage: parsed.data.stage } : {}),
          ...(parsed.data.contactId !== undefined
            ? { contactId: parsed.data.contactId === "" ? null : parsed.data.contactId }
            : {}),
          ...(parsed.data.assignedToId !== undefined
            ? { assignedToId: parsed.data.assignedToId === "" ? null : parsed.data.assignedToId }
            : {}),
          ...(stageChanged ? { lastMovedAt: new Date() } : {}),
        },
      });

      let notifyPairs: Awaited<ReturnType<typeof applyStockForWonTransition>> = [];
      if (wonBefore !== wonAfter && effectiveLineItems.length > 0) {
        notifyPairs = await applyStockForWonTransition(tx, {
          lineItems: effectiveLineItems,
          entering: wonAfter,
          dealTitle: updated.title,
          actorUserId: session.userId,
        });
      }

      if (stageChanged) {
        await tx.activity.create({
          data: {
            workspaceId: session.workspaceId,
            contactId: existing.contactId,
            type: "DEAL_MOVED",
            content: `Deal "${existing.title}" moved from ${existing.stage} to ${updated.stage}`,
            createdById: session.userId,
          },
        });
      }

      return [updated, notifyPairs] as const;
    });

    for (const { before, after } of notifyPairs) {
      await notifyIfLowStockCrossed(before, after);
    }

    if (stageChanged) {
      void triggerN8n({
        event: "deal-moved",
        dealId: deal.id,
        workspaceId: session.workspaceId,
        stage: deal.stage,
      });
    }

    return ok(deal);
  } catch (err) {
    if (err instanceof StockError) return fail(err.message, 400);
    throw err;
  }
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
