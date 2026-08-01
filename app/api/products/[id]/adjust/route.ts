import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { adjustStock, StockError } from "@/lib/stock";

const adjustSchema = z.object({
  delta: z.coerce
    .number()
    .int()
    .refine((d) => d !== 0, { message: "Delta cannot be zero" }),
  reason: z.string().max(500).optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const product = await db.product.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId, deleted: false },
  });
  if (!product) return fail("Product not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  try {
    const updated = await adjustStock({
      product,
      delta: parsed.data.delta,
      reason: parsed.data.reason,
      actorUserId: session.userId,
    });
    return ok(updated);
  } catch (err) {
    if (err instanceof StockError) return fail(err.message, 400);
    throw err;
  }
}
