"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
} from "@/components/ui/sheet";

export type DealLineItemValue = { productId: string; quantity: number };

export type DealFormValues = {
  id?: string;
  title: string;
  value: string;
  stage: string;
  contactId: string;
  assignedToId: string;
  lineItems: DealLineItemValue[];
};

function LineItemsEditor({
  lineItems,
  products,
  onChange,
}: {
  lineItems: DealLineItemValue[];
  products: { id: string; name: string; unitPrice: number }[];
  onChange: (items: DealLineItemValue[]) => void;
}) {
  function addRow() {
    const firstUnused = products.find((p) => !lineItems.some((li) => li.productId === p.id));
    if (!firstUnused) return;
    onChange([...lineItems, { productId: firstUnused.id, quantity: 1 }]);
  }

  function updateRow(index: number, patch: Partial<DealLineItemValue>) {
    onChange(lineItems.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  function removeRow(index: number) {
    onChange(lineItems.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1.5">
      <Label>Products</Label>
      {lineItems.length === 0 && (
        <p className="text-xs text-muted-foreground">No products attached — this deal is tracked by value only.</p>
      )}
      <div className="space-y-2">
        {lineItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={item.productId}
              onValueChange={(v) => updateRow(i, { productId: v })}
            >
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              step="1"
              value={item.quantity}
              onChange={(e) => updateRow(i, { quantity: Number(e.target.value) || 1 })}
              className="h-8 w-16 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeRow(i)}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
      {lineItems.length < products.length && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" />
          Add product
        </Button>
      )}
    </div>
  );
}

export function DealFormSheet({
  open,
  onOpenChange,
  initial,
  contacts,
  users,
  columns,
  products,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DealFormValues;
  contacts: { id: string; name: string }[];
  users: { id: string; name: string | null }[];
  columns: { key: string; label: string }[];
  products: { id: string; name: string; unitPrice: number }[];
  onDelete?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastKey, setLastKey] = useState(initial.id ?? "new");
  const key = initial.id ?? `new-${initial.stage}`;
  if (key !== lastKey) {
    setLastKey(key);
    setValues(initial);
  }

  function set<K extends keyof DealFormValues>(k: K, v: DealFormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    if (!values.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    const isEdit = Boolean(values.id);
    const res = await fetch(isEdit ? `/api/deals/${values.id}` : "/api/deals", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        value: Number(values.value) || 0,
        stage: values.stage,
        contactId: values.contactId || null,
        assignedToId: values.assignedToId || null,
        lineItems: values.lineItems,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to save deal");
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  async function remove() {
    if (!values.id) return;
    setSaving(true);
    await fetch(`/api/deals/${values.id}`, { method: "DELETE" });
    setSaving(false);
    onOpenChange(false);
    onDelete?.();
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{values.id ? "Edit deal" : "Add deal"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={values.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Value ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={values.value}
                onChange={(e) => set("value", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select
                value={values.stage}
                onValueChange={(v) => set("stage", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Contact</Label>
            <Select
              value={values.contactId || "none"}
              onValueChange={(v) => set("contactId", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No contact</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned to</Label>
            <Select
              value={values.assignedToId || "unassigned"}
              onValueChange={(v) => set("assignedToId", v === "unassigned" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? "Unnamed"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {products.length > 0 && (
            <LineItemsEditor
              lineItems={values.lineItems}
              products={products}
              onChange={(items) => set("lineItems", items)}
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : values.id ? "Save changes" : "Add deal"}
            </Button>
            {values.id && (
              <Button variant="destructive" onClick={remove} disabled={saving}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
