import { Prisma } from "@prisma/client";
import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

// quantity is deliberately not editable here — all quantity changes go
// through /api/products/[id]/adjust so the movement ledger stays complete.
const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().max(64).optional().nullable(),
  unitPrice: z.coerce.number().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.product.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId, deleted: false },
  });
  if (!existing) return fail("Product not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  try {
    const product = await db.product.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.sku !== undefined
          ? { sku: parsed.data.sku?.trim() || null }
          : {}),
        ...(parsed.data.unitPrice !== undefined
          ? { unitPrice: parsed.data.unitPrice }
          : {}),
        ...(parsed.data.lowStockThreshold !== undefined
          ? { lowStockThreshold: parsed.data.lowStockThreshold }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: parsed.data.notes || null }
          : {}),
      },
    });
    return ok(product);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return fail("SKU already exists in this workspace", 409);
    }
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.product.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId, deleted: false },
  });
  if (!existing) return fail("Product not found", 404);

  await db.product.update({
    where: { id: existing.id },
    data: { deleted: true },
  });

  return ok({ id: existing.id, deleted: true });
}
