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

export function canAccessDeal(session: ApiSession, deal: { assignedToId: string | null }) {
  return session.role === "ADMIN" || deal.assignedToId === session.userId;
}

/**
 * Must run inside the same transaction as the Payment create/update it
 * guards, AND that transaction must use Serializable isolation (or
 * equivalent row locking) — under the default READ COMMITTED isolation,
 * two concurrent payments can each read the sum before the other's write
 * commits, both pass validation, and both commit, overpaying the deal.
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
  const alreadyPaid = new Prisma.Decimal(existingTotal._sum.amount ?? 0);
  const newTotal = alreadyPaid.plus(opts.amount);
  const dealValue = new Prisma.Decimal(opts.dealValue);
  if (newTotal.greaterThan(dealValue)) {
    throw new PaymentError("Payment would exceed the deal's remaining balance");
  }
}
