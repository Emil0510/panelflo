import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const importSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        sku: z.string().max(64).optional(),
        unitPrice: z.coerce.number().min(0).optional(),
        quantity: z.coerce.number().int().min(0).optional(),
        lowStockThreshold: z.coerce.number().int().min(0).optional(),
        notes: z.string().max(5000).optional(),
      })
    )
    .min(1)
    .max(500),
});

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  // Skip rows whose SKU already exists in the workspace (or repeats in the file)
  const incomingSkus = parsed.data.products
    .map((p) => p.sku?.trim())
    .filter(Boolean) as string[];
  const existing = incomingSkus.length
    ? await db.product.findMany({
        where: {
          workspaceId: session.workspaceId,
          sku: { in: incomingSkus },
        },
        select: { sku: true },
      })
    : [];
  const taken = new Set(existing.map((p) => p.sku));

  const rows: typeof parsed.data.products = [];
  let skipped = 0;
  for (const p of parsed.data.products) {
    const sku = p.sku?.trim() || null;
    if (sku) {
      if (taken.has(sku)) {
        skipped++;
        continue;
      }
      taken.add(sku);
    }
    rows.push({ ...p, sku: sku ?? undefined });
  }

  if (rows.length === 0) {
    return fail("All rows skipped — every SKU already exists", 409);
  }

  await db.$transaction(
    async (tx) => {
      for (const p of rows) {
        const quantity = p.quantity ?? 0;
        const created = await tx.product.create({
          data: {
            workspaceId: session.workspaceId,
            name: p.name,
            sku: p.sku ?? null,
            unitPrice: p.unitPrice ?? 0,
            quantity,
            lowStockThreshold: p.lowStockThreshold ?? 0,
            notes: p.notes || null,
          },
        });
        if (quantity > 0) {
          await tx.stockMovement.create({
            data: {
              workspaceId: session.workspaceId,
              productId: created.id,
              delta: quantity,
              reason: "Bulk import",
              createdById: session.userId,
            },
          });
        }
      }
      await tx.activity.create({
        data: {
          workspaceId: session.workspaceId,
          type: "STOCK_MOVEMENT",
          content: `Bulk import: ${rows.length} product${rows.length === 1 ? "" : "s"} added${skipped > 0 ? ` (${skipped} skipped)` : ""}`,
          createdById: session.userId,
        },
      });
    },
    { timeout: 30000 }
  );

  return ok({ imported: rows.length, skipped });
}
