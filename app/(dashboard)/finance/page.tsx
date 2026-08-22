import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { PaymentFormSheet } from "@/components/finance/payment-form-sheet";
import { PaymentsTable } from "@/components/finance/payments-table";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scopeDealsToSession, scopePaymentsToSession } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const apiSession = {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };

  const [payments, deals] = await Promise.all([
    db.payment.findMany({
      where: scopePaymentsToSession(apiSession),
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
    }),
    db.deal.findMany({
      where: scopeDealsToSession(apiSession),
      select: {
        id: true,
        title: true,
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { lastMovedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Finance</h2>
        <PaymentFormSheet
          deals={deals}
          trigger={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Log Payment
            </Button>
          }
        />
      </div>
      <PaymentsTable
        payments={payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          paidAt: p.paidAt.toISOString(),
          notes: p.notes,
          deal: {
            id: p.deal.id,
            title: p.deal.title,
            value: Number(p.deal.value),
            contact: p.deal.contact,
            assignedTo: p.deal.assignedTo,
          },
        }))}
        deals={deals}
        showAssignee={apiSession.role === "ADMIN"}
      />
    </div>
  );
}
