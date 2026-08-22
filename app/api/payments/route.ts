import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { assertNoOverpayment, PaymentError, scopeDealsToSession, scopePaymentsToSession } from "@/lib/payments";

const paymentSchema = z.object({
  dealId: z.string(),
  amount: z.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTHER"]),
  paidAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get("dealId");

  const payments = await db.payment.findMany({
    where: {
      ...scopePaymentsToSession(session),
      ...(dealId ? { dealId } : {}),
    },
    include: {
      deal: {
        select: {
          id: true,
          title: true,
          value: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  return ok(payments, { count: payments.length });
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const deal = await db.deal.findFirst({
    where: { id: parsed.data.dealId, ...scopeDealsToSession(session) },
  });
  if (!deal) return fail("Deal not found", 404);

  try {
    const payment = await db.$transaction(
      async (tx) => {
        await assertNoOverpayment(tx, {
          dealId: deal.id,
          dealValue: deal.value,
          amount: parsed.data.amount,
        });

        const created = await tx.payment.create({
          data: {
            workspaceId: session.workspaceId,
            dealId: deal.id,
            amount: parsed.data.amount,
            method: parsed.data.method,
            paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
            notes: parsed.data.notes || null,
            createdById: session.userId,
          },
        });

        await tx.activity.create({
          data: {
            workspaceId: session.workspaceId,
            contactId: deal.contactId,
            type: "PAYMENT_RECEIVED",
            content: `Payment of $${parsed.data.amount.toLocaleString()} logged on deal "${deal.title}"`,
            createdById: session.userId,
          },
        });

        return created;
      },
      { timeout: 20000, maxWait: 5000 }
    );

    return ok(payment);
  } catch (err) {
    if (err instanceof PaymentError) return fail(err.message, 400);
    throw err;
  }
}
