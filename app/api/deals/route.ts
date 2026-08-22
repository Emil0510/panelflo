import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { getWorkspacePipelineColumns } from "@/lib/columns";
import { applyStockForWonTransition, StockError } from "@/lib/deals";
import { db } from "@/lib/db";
import { notifyIfLowStockCrossed } from "@/lib/stock";

const lineItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const dealSchema = z.object({
  title: z.string().min(1).max(200),
  value: z.number().min(0).optional(),
  stage: z.string().min(1).max(50).optional(),
  contactId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");

  const deals = await db.deal.findMany({
    where: {
      workspaceId: session.workspaceId,
      ...(stage ? { stage } : {}),
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

  const cols = await getWorkspacePipelineColumns(session.workspaceId);
  const stage = parsed.data.stage ?? cols[0]?.key ?? "LEAD";
  const targetCol = cols.find((c) => c.key === stage);
  if (parsed.data.stage !== undefined && !targetCol) {
    return fail("Unknown pipeline stage", 400);
  }
  const wonOnCreate = targetCol?.isWonStage ?? false;

  try {
    const [deal, notifyPairs] = await db.$transaction(
      async (tx) => {
        const created = await tx.deal.create({
          data: {
            workspaceId: session.workspaceId,
            title: parsed.data.title,
            value: parsed.data.value ?? 0,
            stage,
            contactId: parsed.data.contactId || null,
            assignedToId: parsed.data.assignedToId || null,
          },
        });

        if (parsed.data.lineItems) {
          for (const li of parsed.data.lineItems) {
            const product = await tx.product.findFirst({
              where: { id: li.productId, workspaceId: session.workspaceId, deleted: false },
            });
            if (!product) throw new StockError("One of the selected products no longer exists");
            await tx.dealLineItem.create({
              data: {
                dealId: created.id,
                productId: li.productId,
                quantity: li.quantity,
                unitPriceAtSale: product.unitPrice,
              },
            });
          }
        }

        let notifyPairs: Awaited<ReturnType<typeof applyStockForWonTransition>> = [];
        if (wonOnCreate && parsed.data.lineItems && parsed.data.lineItems.length > 0) {
          notifyPairs = await applyStockForWonTransition(tx, {
            lineItems: parsed.data.lineItems,
            entering: true,
            dealTitle: created.title,
            actorUserId: session.userId,
          });
        }

        return [created, notifyPairs] as const;
      },
      { timeout: 20000, maxWait: 5000 }
    );

    try {
      for (const { before, after } of notifyPairs) {
        await notifyIfLowStockCrossed(before, after);
      }
    } catch {
      // Best-effort — the deal/stock change already committed successfully;
      // a notification failure must not surface as a request error.
    }

    return ok(deal);
  } catch (err) {
    if (err instanceof StockError) return fail(err.message, 400);
    throw err;
  }
}
