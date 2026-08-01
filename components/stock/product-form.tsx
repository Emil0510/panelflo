"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type ProductFormValues = {
  id?: string;
  name: string;
  sku: string;
  unitPrice: string;
  quantity: string;
  lowStockThreshold: string;
  notes: string;
};

const EMPTY: ProductFormValues = {
  name: "",
  sku: "",
  unitPrice: "",
  quantity: "",
  lowStockThreshold: "",
  notes: "",
};

export function ProductFormSheet({
  initial,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  initial?: ProductFormValues;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [values, setValues] = useState<ProductFormValues>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(values.id);

  function set<K extends keyof ProductFormValues>(
    key: K,
    val: ProductFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function save() {
    if (!values.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      sku: values.sku.trim() || null,
      unitPrice: values.unitPrice === "" ? 0 : Number(values.unitPrice),
      lowStockThreshold:
        values.lowStockThreshold === "" ? 0 : Number(values.lowStockThreshold),
      notes: values.notes.trim() || null,
    };
    if (!isEdit) {
      payload.quantity = values.quantity === "" ? 0 : Number(values.quantity);
    }

    const res = await fetch(
      isEdit ? `/api/products/${values.id}` : "/api/products",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to save product");
      return;
    }
    setOpen(false);
    if (!isEdit) setValues(EMPTY);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit product" : "Add product"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input
                value={values.sku}
                onChange={(e) => set("sku", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={values.unitPrice}
                onChange={(e) => set("unitPrice", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              {isEdit ? (
                <div>
                  <Input value={values.quantity} disabled />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use Adjust to change quantity
                  </p>
                </div>
              ) : (
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={values.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Low-stock threshold</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={values.lowStockThreshold}
                onChange={(e) => set("lowStockThreshold", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add product"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
