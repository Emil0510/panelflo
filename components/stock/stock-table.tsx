"use client";

import {
  ArrowUpDown,
  Minus,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { AdjustStockDialog } from "@/components/stock/adjust-stock-dialog";
import { StockImportDialog } from "@/components/stock/stock-import-dialog";
import {
  ProductFormSheet,
  type ProductFormValues,
} from "@/components/stock/product-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lowStockThreshold: number;
  notes: string | null;
};

function isLow(p: ProductRow) {
  return p.quantity <= p.lowStockThreshold;
}

type SortKey = "name" | "sku" | "quantity" | "unitPrice";

const ICON_PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
];

function iconClass(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ICON_PALETTE[hash % ICON_PALETTE.length];
}

export function StockTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [editing, setEditing] = useState<ProductFormValues | null>(null);
  const [adjusting, setAdjusting] = useState<ProductRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q);
      return matchesSearch && (!lowOnly || isLow(p));
    });

    if (sortKey) {
      const dir = sortAsc ? 1 : -1;
      return rows.sort((a, b) => {
        if (sortKey === "quantity" || sortKey === "unitPrice") {
          return (a[sortKey] - b[sortKey]) * dir;
        }
        return (a[sortKey] ?? "").localeCompare(b[sortKey] ?? "") * dir;
      });
    }
    // default: low stock first, then name
    return rows.sort(
      (a, b) =>
        Number(isLow(b)) - Number(isLow(a)) || a.name.localeCompare(b.name)
    );
  }, [products, search, lowOnly, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  async function quickAdjust(p: ProductRow, delta: number) {
    setPendingId(p.id);
    const res = await fetch(`/api/products/${p.id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    setPendingId(null);
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "Adjustment failed");
      return;
    }
    router.refresh();
  }

  async function remove(p: ProductRow) {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "Delete failed");
      return;
    }
    toast.success(`Deleted ${p.name}`);
    router.refresh();
  }

  const lowCount = products.filter(isLow).length;
  const totalValue = products.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {products.length} product{products.length === 1 ? "" : "s"}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          ${Math.round(totalValue).toLocaleString()} value
        </span>
        {lowCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
            {lowCount} low stock
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={lowOnly}
            onCheckedChange={(v) => setLowOnly(v === true)}
          />
          Low stock only
        </label>
        <div className="ml-auto flex gap-2">
          <StockImportDialog />
          <ProductFormSheet
            trigger={
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add product
              </Button>
            }
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b bg-card">
            <tr>
              {(
                [
                  ["name", "Product"],
                  ["sku", "SKU"],
                  ["unitPrice", "Price"],
                  ["quantity", "Quantity"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                >
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Adjust
              </th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    icon={Package}
                    title={products.length === 0 ? "No products yet" : "No products match your filters"}
                    description={
                      products.length === 0
                        ? "Add your first product to start tracking stock."
                        : "Try adjusting your search or filters."
                    }
                  />
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3.5 font-medium">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass(p.id)}`}>
                        <Package className="h-4 w-4" />
                      </span>
                      {p.name}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {p.sku ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    ${p.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 font-medium tabular-nums">
                    {p.quantity}
                  </td>
                  <td className="px-4 py-3.5">
                    {isLow(p) ? (
                      <Badge
                        className="bg-amber-100 text-amber-800"
                        variant="outline"
                      >
                        Low stock
                      </Badge>
                    ) : (
                      <Badge
                        className="bg-primary-light text-primary-dark"
                        variant="outline"
                      >
                        In stock
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={pendingId === p.id || p.quantity === 0}
                        onClick={() => quickAdjust(p, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={pendingId === p.id}
                        onClick={() => quickAdjust(p, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setAdjusting(p)}
                      >
                        Adjust…
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setEditing({
                              id: p.id,
                              name: p.name,
                              sku: p.sku ?? "",
                              unitPrice: String(p.unitPrice),
                              quantity: String(p.quantity),
                              lowStockThreshold: String(p.lowStockThreshold),
                              notes: p.notes ?? "",
                            })
                          }
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => remove(p)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductFormSheet
          key={editing.id}
          initial={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
      {adjusting && (
        <AdjustStockDialog
          productId={adjusting.id}
          productName={adjusting.name}
          open
          onOpenChange={(open) => {
            if (!open) setAdjusting(null);
          }}
        />
      )}
    </div>
  );
}
