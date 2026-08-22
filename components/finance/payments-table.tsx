"use client";

import { Pencil, Trash2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PaymentFormSheet, type FinanceDealOption } from "@/components/finance/payment-form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type PaymentRow = {
  id: string;
  amount: number;
  method: "CASH" | "BANK_TRANSFER" | "CARD" | "OTHER";
  paidAt: string;
  notes: string | null;
  deal: {
    id: string;
    title: string;
    value: number;
    contact: { id: string; firstName: string; lastName: string | null } | null;
    assignedTo: { id: string; name: string | null } | null;
  };
};

const METHOD_LABELS: Record<PaymentRow["method"], string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
};

export function PaymentsTable({
  payments,
  deals,
  showAssignee,
}: {
  payments: PaymentRow[];
  deals: FinanceDealOption[];
  showAssignee: boolean;
}) {
  const router = useRouter();

  async function remove(p: PaymentRow) {
    if (!confirm(`Delete this $${p.amount.toLocaleString()} payment on "${p.deal.title}"?`)) return;
    const res = await fetch(`/api/payments/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "Delete failed");
      return;
    }
    toast.success("Payment deleted");
    router.refresh();
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={Wallet}
          title="No payments yet"
          description="Log a payment against a deal to start tracking revenue."
        />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-card">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Deal</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Contact</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Method</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
            {showAssignee && (
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Rep</th>
            )}
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="px-3 py-3 font-medium">{p.deal.title}</td>
              <td className="px-3 py-3 text-muted-foreground">
                {p.deal.contact ? `${p.deal.contact.firstName} ${p.deal.contact.lastName ?? ""}` : "—"}
              </td>
              <td className="px-3 py-3">${p.amount.toLocaleString()}</td>
              <td className="px-3 py-3">
                <Badge variant="outline">{METHOD_LABELS[p.method]}</Badge>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {new Date(p.paidAt).toLocaleDateString()}
              </td>
              {showAssignee && (
                <td className="px-3 py-3 text-muted-foreground">
                  {p.deal.assignedTo?.name ?? "Unassigned"}
                </td>
              )}
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  <PaymentFormSheet
                    deals={deals}
                    initial={{
                      id: p.id,
                      dealId: p.deal.id,
                      amount: String(p.amount),
                      method: p.method,
                      paidAt: p.paidAt.slice(0, 10),
                      notes: p.notes ?? "",
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
