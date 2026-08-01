import { Product } from "@prisma/client";

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export function isLowStock(p: Pick<Product, "quantity" | "lowStockThreshold">) {
  return p.quantity <= p.lowStockThreshold;
}

export class StockError extends Error {}

/**
 * Single entry point for all quantity changes (web + bot) so the movement
 * ledger stays complete and low-stock alerts fire exactly once per crossing.
 */
export async function adjustStock(opts: {
  product: Product;
  delta: number;
  reason?: string | null;
  actorUserId?: string | null;
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

  const [updated] = await db.$transaction([
    db.product.update({
      where: { id: product.id },
      data: { quantity: { increment: delta } },
    }),
    db.stockMovement.create({
      data: {
        workspaceId: product.workspaceId,
        productId: product.id,
        delta,
        reason: opts.reason?.trim() || null,
        createdById: opts.actorUserId ?? null,
      },
    }),
    db.activity.create({
      data: {
        workspaceId: product.workspaceId,
        type: "STOCK_MOVEMENT",
        content: activityContent,
        createdById: opts.actorUserId ?? null,
      },
    }),
  ]);

  const crossedDown =
    product.quantity > product.lowStockThreshold &&
    updated.quantity <= updated.lowStockThreshold;

  if (crossedDown) {
    const users = await db.user.findMany({
      where: { workspaceId: product.workspaceId },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) =>
        createNotification({
          userId: u.id,
          workspaceId: product.workspaceId,
          title: `Low stock: ${updated.name}`,
          body: `${updated.quantity} left (threshold ${updated.lowStockThreshold})`,
          type: "SYSTEM",
          link: "/stock",
        })
      )
    );
  }

  return updated;
}
