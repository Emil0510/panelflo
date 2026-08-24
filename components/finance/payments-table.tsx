"use client";

import { Banknote, CreditCard, Landmark, Pencil, Trash2, Wallet } from "lucide-react";
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

const METHOD_ICONS: Record<PaymentRow["method"], typeof Banknote> = {
  CASH: Banknote,
  BANK_TRANSFER: Landmark,
  CARD: CreditCard,
  OTHER: Wallet,
};

const METHOD_BADGE_CLASS: Record<PaymentRow["method"], string> = {
  CASH: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
  BANK_TRANSFER: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
  CARD: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
  OTHER: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400",
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
      const json = await res.json().catch(() => ({}));
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
    <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 border-b bg-card">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Deal</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Method</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
            {showAssignee && (
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Rep</th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => {
            const MethodIcon = METHOD_ICONS[p.method];
            return (
              <tr key={p.id} className="border-b last:border-0 transition-colors hover:bg-muted/40">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${METHOD_BADGE_CLASS[p.method]}`}
                    >
                      <MethodIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">{p.deal.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.deal.contact ? `${p.deal.contact.firstName} ${p.deal.contact.lastName ?? ""}` : "No contact"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-semibold">${p.amount.toLocaleString()}</td>
                <td className="px-4 py-3.5">
                  <Badge variant="outline" className={METHOD_BADGE_CLASS[p.method]}>
                    {METHOD_LABELS[p.method]}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 text-muted-foreground">
                  {p.paidAt.slice(0, 10)}
                </td>
                {showAssignee && (
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {p.deal.assignedTo?.name ?? "Unassigned"}
                  </td>
                )}
                <td className="px-4 py-3.5">
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
