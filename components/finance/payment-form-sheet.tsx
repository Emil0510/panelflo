"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type FinanceDealOption = {
  id: string;
  title: string;
  contact: { firstName: string; lastName: string | null } | null;
};

export type PaymentFormValues = {
  id?: string;
  dealId: string;
  amount: string;
  method: "CASH" | "BANK_TRANSFER" | "CARD" | "OTHER";
  paidAt: string;
  notes: string;
};

const EMPTY: PaymentFormValues = {
  dealId: "",
  amount: "",
  method: "CASH",
  paidAt: new Date().toISOString().slice(0, 10),
  notes: "",
};

const METHOD_LABELS: Record<PaymentFormValues["method"], string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
};

export function PaymentFormSheet({
  deals,
  initial,
  trigger,
}: {
  deals: FinanceDealOption[];
  initial?: PaymentFormValues;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PaymentFormValues>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PaymentFormValues>(key: K, val: PaymentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function save() {
    const amountNum = Number(values.amount);
    if (!values.dealId) {
      setError("Select a deal");
      return;
    }
    if (!values.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    setError(null);

    const isEdit = Boolean(values.id);
    const res = await fetch(
      isEdit ? `/api/payments/${values.id}` : "/api/payments",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: values.dealId,
          amount: amountNum,
          method: values.method,
          paidAt: values.paidAt,
          notes: values.notes || (isEdit ? null : undefined),
        }),
      }
    );
    setSaving(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to save payment");
      return;
    }
    setOpen(false);
    if (!isEdit) setValues(EMPTY);
    toast.success(isEdit ? "Payment updated" : "Payment logged");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{values.id ? "Edit payment" : "Log payment"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Deal *</Label>
            <Select
              value={values.dealId}
              onValueChange={(v) => set("dealId", v)}
              disabled={Boolean(values.id)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a deal" />
              </SelectTrigger>
              <SelectContent>
                {deals.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title}
                    {d.contact ? ` — ${d.contact.firstName} ${d.contact.lastName ?? ""}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={values.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select
                value={values.method}
                onValueChange={(v) => set("method", v as PaymentFormValues["method"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(METHOD_LABELS) as PaymentFormValues["method"][]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={values.paidAt}
              onChange={(e) => set("paidAt", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Saving…" : values.id ? "Save changes" : "Log payment"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
