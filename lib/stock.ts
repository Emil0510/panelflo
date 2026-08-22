import { Prisma, Product } from "@prisma/client";

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export function isLowStock(p: Pick<Product, "quantity" | "lowStockThreshold">) {
  return p.quantity <= p.lowStockThreshold;
}

export class StockError extends Error {}

/**
 * Sends the low-stock notification if this change crossed the threshold
 * going down. Split out from adjustStock so a caller composing several
 * adjustStock calls inside one transaction can defer notifications until
 * after that transaction actually commits.
 */
export async function notifyIfLowStockCrossed(before: Product, after: Product) {
  const crossedDown =
    before.quantity > before.lowStockThreshold && after.quantity <= after.lowStockThreshold;
  if (!crossedDown) return;

  const users = await db.user.findMany({
    where: { workspaceId: after.workspaceId },
    select: { id: true },
  });
  await Promise.all(
    users.map((u) =>
      createNotification({
        userId: u.id,
        workspaceId: after.workspaceId,
        title: `Low stock: ${after.name}`,
        body: `${after.quantity} left (threshold ${after.lowStockThreshold})`,
        type: "SYSTEM",
        link: "/stock",
      })
    )
  );
}

/**
 * Single entry point for all quantity changes (web + bot) so the movement
 * ledger stays complete and low-stock alerts fire exactly once per crossing.
 *
 * Pass `tx` to run inside a caller-managed transaction (e.g. one deal update
 * plus several line items' stock movements as one atomic unit) — in that
 * case the caller is responsible for calling notifyIfLowStockCrossed itself
 * after the outer transaction commits, since notifying before commit could
 * announce a change that later gets rolled back.
 */
export async function adjustStock(opts: {
  product: Product;
  delta: number;
  reason?: string | null;
  actorUserId?: string | null;
  tx?: Prisma.TransactionClient;
}): Promise<Product> {
  const { product, delta } = opts;

  const after = product.quantity + delta;
  if (after < 0) {
    throw new StockError(
      `Only ${product.quantity} in stock — cannot remove ${Math.abs(delta)}`
    );
  }

  const direction = delta > 0 ? "+" : "";
  const reasonSuffix = opts.reason?.trim() ? ` — ${opts.reason.trim()}` : "";
  const activityContent = `Stock ${delta > 0 ? "in" : "out"}: ${product.name} ${direction}${delta}${reasonSuffix}`;

  async function doWrites(client: Prisma.TransactionClient) {
    const updated = await client.product.update({
      where: { id: product.id },
      data: { quantity: { increment: delta } },
    });
    await client.stockMovement.create({
      data: {
        workspaceId: product.workspaceId,
        productId: product.id,
        delta,
        reason: opts.reason?.trim() || null,
        createdById: opts.actorUserId ?? null,
      },
    });
    await client.activity.create({
      data: {
        workspaceId: product.workspaceId,
        type: "STOCK_MOVEMENT",
        content: activityContent,
        createdById: opts.actorUserId ?? null,
      },
    });
    return updated;
  }

  const updated = opts.tx ? await doWrites(opts.tx) : await db.$transaction((tx) => doWrites(tx));

  if (!opts.tx) {
    await notifyIfLowStockCrossed(product, updated);
  }

  return updated;
}
