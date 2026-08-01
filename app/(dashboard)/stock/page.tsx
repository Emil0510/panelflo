import { redirect } from "next/navigation";

import { StockTable } from "@/components/stock/stock-table";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const products = await db.product.findMany({
    where: { workspaceId: session.user.workspaceId, deleted: false },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex h-full flex-col">
      <StockTable
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          unitPrice: Number(p.unitPrice),
          quantity: p.quantity,
          lowStockThreshold: p.lowStockThreshold,
          notes: p.notes,
        }))}
      />
    </div>
  );
}
