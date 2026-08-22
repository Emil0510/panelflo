import { Prisma } from "@prisma/client";

import type { ApiSession } from "@/lib/api";

export class PaymentError extends Error {}

export function scopePaymentsToSession(session: ApiSession) {
  return session.role === "ADMIN"
    ? { workspaceId: session.workspaceId }
    : { workspaceId: session.workspaceId, deal: { assignedToId: session.userId } };
}

export function scopeDealsToSession(session: ApiSession) {
  return session.role === "ADMIN"
    ? { workspaceId: session.workspaceId }
    : { workspaceId: session.workspaceId, assignedToId: session.userId };
}

/**
 * Must run inside the same transaction as the Payment create/update it
 * guards — reading the current sum and writing the new row have to be
 * atomic, or two concurrent payments could both pass validation against
 * a stale total.
 */
export async function assertNoOverpayment(
  tx: Prisma.TransactionClient,
  opts: {
    dealId: string;
    dealValue: Prisma.Decimal | number;
    amount: number;
    excludePaymentId?: string;
  }
) {
  const existingTotal = await tx.payment.aggregate({
    where: {
      dealId: opts.dealId,
      ...(opts.excludePaymentId ? { id: { not: opts.excludePaymentId } } : {}),
    },
    _sum: { amount: true },
  });
  const alreadyPaid = Number(existingTotal._sum.amount ?? 0);
  if (alreadyPaid + opts.amount > Number(opts.dealValue)) {
    throw new PaymentError("Payment would exceed the deal's remaining balance");
  }
}
