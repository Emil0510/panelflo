"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Row = {
  name: string;
  sku: string;
  unitPrice: string;
  quantity: string;
  lowStockThreshold: string;
};

const HEADER_ALIASES: Record<string, keyof Row> = {
  name: "name",
  product: "name",
  "product name": "name",
  title: "name",
  sku: "sku",
  code: "sku",
  "product code": "sku",
  price: "unitPrice",
  "unit price": "unitPrice",
  unitprice: "unitPrice",
  cost: "unitPrice",
  quantity: "quantity",
  qty: "quantity",
  stock: "quantity",
  pieces: "quantity",
  pcs: "quantity",
  amount: "quantity",
  threshold: "lowStockThreshold",
  "low stock threshold": "lowStockThreshold",
  "min stock": "lowStockThreshold",
  minimum: "lowStockThreshold",
};

function parseCsv(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = splitLine(lines[0]).map(
    (h) => HEADER_ALIASES[h.toLowerCase()] ?? null
  );

  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Row = {
      name: "",
      sku: "",
      unitPrice: "",
      quantity: "",
      lowStockThreshold: "",
    };
    headers.forEach((key, i) => {
      if (key && cells[i]) row[key] = cells[i];
    });
    return row;
  });
}

export function StockImportDialog() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text).filter((r) => r.name);
    setError(
      parsed.length === 0
        ? "No valid rows found. Need at least a name column."
        : parsed.length > 500
          ? "Max 500 rows per import — only the first 500 will be imported."
          : null
    );
    setRows(parsed.slice(0, 500));
    setVisibleCount(20);
  }

  async function runImport() {
    setImporting(true);
    const res = await fetch("/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        products: rows.map((r) => ({
          name: r.name,
          sku: r.sku || undefined,
          unitPrice: r.unitPrice ? Number(r.unitPrice) : undefined,
          quantity: r.quantity ? Number(r.quantity) : undefined,
          lowStockThreshold: r.lowStockThreshold
            ? Number(r.lowStockThreshold)
            : undefined,
        })),
      }),
    });
    setImporting(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Import failed");
      return;
    }
    toast.success(
      `Imported ${json.data.imported} product${
        json.data.imported === 1 ? "" : "s"
      }` +
        (json.data.skipped > 0
          ? `, skipped ${json.data.skipped} (SKU already exists)`
          : "")
    );
    setOpen(false);
    setRows([]);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import products from CSV</DialogTitle>
          <DialogDescription>
            Columns recognized: name, sku, price, quantity (qty/pcs), threshold.
            Max 500 rows. Rows with an existing SKU are skipped.
          </DialogDescription>
        </DialogHeader>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="text-sm"
        />
        {error && <p className="text-sm text-amber-600">{error}</p>}
        {rows.length > 0 && (
          <>
            <div className="max-h-80 overflow-auto rounded border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 border-b bg-card">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-left font-medium text-muted-foreground">
                      #
                    </th>
                    {["Name", "SKU", "Price", "Qty", "Threshold"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, visibleCount).map((r, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.sku || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.unitPrice || "0"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.quantity || "0"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.lowStockThreshold || "0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > visibleCount && (
                <div className="border-t p-2 text-center">
                  <button
                    onClick={() =>
                      setVisibleCount((n) => Math.min(n + 20, rows.length))
                    }
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Show more ({rows.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </div>
            <Button onClick={runImport} disabled={importing}>
              {importing ? "Importing…" : `Import ${rows.length} products`}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
