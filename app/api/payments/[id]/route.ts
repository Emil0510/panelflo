import { Prisma } from "@prisma/client";
import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { assertNoOverpayment, PaymentError, scopePaymentsToSession } from "@/lib/payments";

const updateSchema = z.object({
  amount: z.number().positive().max(9999999999.99).optional(),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTHER"]).optional(),
  paidAt: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.payment.findFirst({
    where: { id: params.id, ...scopePaymentsToSession(session) },
    include: { deal: true },
  });
  if (!existing) return fail("Payment not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const amount = parsed.data.amount ?? Number(existing.amount);

  try {
    const payment = await db.$transaction(
      async (tx) => {
        await assertNoOverpayment(tx, {
          dealId: existing.dealId,
          dealValue: existing.deal.value,
          amount,
          excludePaymentId: existing.id,
        });

        const updated = await tx.payment.update({
          where: { id: existing.id },
          data: {
            ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
            ...(parsed.data.method !== undefined ? { method: parsed.data.method } : {}),
            ...(parsed.data.paidAt !== undefined ? { paidAt: new Date(parsed.data.paidAt) } : {}),
            ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
          },
        });

        await tx.activity.create({
          data: {
            workspaceId: session.workspaceId,
            contactId: existing.deal.contactId,
            type: "PAYMENT_RECEIVED",
            content: `Payment updated on deal "${existing.deal.title}"`,
            createdById: session.userId,
          },
        });

        return updated;
      },
      { timeout: 20000, maxWait: 5000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return ok(payment);
  } catch (err) {
    if (err instanceof PaymentError) return fail(err.message, 400);
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.payment.findFirst({
    where: { id: params.id, ...scopePaymentsToSession(session) },
    include: { deal: true },
  });
  if (!existing) return fail("Payment not found", 404);

  await db.$transaction(
    async (tx) => {
      await tx.payment.delete({ where: { id: existing.id } });
      await tx.activity.create({
        data: {
          workspaceId: session.workspaceId,
          contactId: existing.deal.contactId,
          type: "PAYMENT_RECEIVED",
          content: `Payment removed from deal "${existing.deal.title}"`,
          createdById: session.userId,
        },
      });
    },
    { timeout: 20000, maxWait: 5000 }
  );

  return ok({ deleted: true });
}
