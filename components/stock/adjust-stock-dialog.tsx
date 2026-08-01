"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdjustStockDialog({
  productId,
  productName,
  open,
  onOpenChange,
}: {
  productId: string;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) {
      setError("Enter a positive whole number");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/products/${productId}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delta: direction === "in" ? n : -n,
        reason: reason.trim() || null,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Adjustment failed");
      return;
    }
    toast.success(
      `${productName}: ${direction === "in" ? "+" : "−"}${n} recorded`
    );
    onOpenChange(false);
    setQty("");
    setReason("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust stock — {productName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={direction === "in" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setDirection("in")}
            >
              Stock in
            </Button>
            <Button
              type="button"
              variant={direction === "out" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setDirection("out")}
            >
              Stock out
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="e.g. Sold to Acme, damaged, restock…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Apply adjustment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
