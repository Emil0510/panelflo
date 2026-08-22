import { Prisma, Product } from "@prisma/client";

import { adjustStock } from "@/lib/stock";

export { StockError } from "@/lib/stock";

export type LineItemInput = { productId: string; quantity: number };

/**
 * Applies (or reverses) stock movements for a deal's line items when the
 * deal enters or leaves the workspace's won stage. Must run inside the
 * same transaction as the deal's own stage update, so an insufficient-stock
 * failure on any line item rolls back the whole thing — no partial stock
 * changes and no stage change without matching stock movements.
 *
 * entering=true consumes stock (delta is negative per item); entering=false
 * restores it (delta is positive). Returns before/after Product pairs so
 * the caller can fire low-stock notifications once the outer transaction
 * has actually committed.
 */
export async function applyStockForWonTransition(
  tx: Prisma.TransactionClient,
  opts: {
    lineItems: LineItemInput[];
    entering: boolean;
    dealTitle: string;
    actorUserId: string;
  }
): Promise<{ before: Product; after: Product }[]> {
  const direction = opts.entering ? -1 : 1;
  const reason = (opts.entering ? "Deal won: " : "Deal reopened: ") + opts.dealTitle;

  const results: { before: Product; after: Product }[] = [];
  for (const item of opts.lineItems) {
    const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
    const updated = await adjustStock({
      product,
      delta: direction * item.quantity,
      reason,
      actorUserId: opts.actorUserId,
      tx,
    });
    results.push({ before: product, after: updated });
  }
  return results;
}
