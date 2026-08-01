import { Prisma } from "@prisma/client";
import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(64).optional().nullable(),
  unitPrice: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const products = await db.product.findMany({
    where: {
      workspaceId: session.workspaceId,
      deleted: false,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(products, { count: products.length });
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const quantity = parsed.data.quantity ?? 0;

  try {
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          workspaceId: session.workspaceId,
          name: parsed.data.name,
          sku: parsed.data.sku?.trim() || null,
          unitPrice: parsed.data.unitPrice ?? 0,
          quantity,
          lowStockThreshold: parsed.data.lowStockThreshold ?? 0,
          notes: parsed.data.notes || null,
        },
      });
      if (quantity > 0) {
        await tx.stockMovement.create({
          data: {
            workspaceId: session.workspaceId,
            productId: created.id,
            delta: quantity,
            reason: "Initial stock",
            createdById: session.userId,
          },
        });
      }
      await tx.activity.create({
        data: {
          workspaceId: session.workspaceId,
          type: "STOCK_MOVEMENT",
          content: `Product added: ${created.name}${quantity > 0 ? ` (initial stock: ${quantity})` : ""}`,
          createdById: session.userId,
        },
      });
      return created;
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
