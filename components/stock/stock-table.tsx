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

  return (
    <div className="flex h-full flex-col gap-4">
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
          {lowCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800" variant="outline">
              {lowCount}
            </Badge>
          )}
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
              <th className="w-10 px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                #
              </th>
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
                  className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"
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
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                Adjust
              </th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  {products.length === 0
                    ? "No products yet. Add your first product to start tracking stock."
                    : "No products match the current filter."}
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/40"
                >
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-3 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {p.name}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {p.sku ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    ${p.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-medium tabular-nums">
                    {p.quantity}
                  </td>
                  <td className="px-3 py-3">
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
                  <td className="px-3 py-3">
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
                  <td className="px-3 py-3">
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
