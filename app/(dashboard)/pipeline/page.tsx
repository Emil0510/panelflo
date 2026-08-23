import { redirect } from "next/navigation";

import { PipelineKanban } from "@/components/pipeline/kanban";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspacePipelineColumns } from "@/lib/columns";
import { canAccessDeal, scopePaymentsToSession } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const apiSession = {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };

  const [deals, contacts, users, columns, products] = await Promise.all([
    db.deal.findMany({
      where: { workspaceId: session.user.workspaceId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        assignedTo: { select: { id: true, name: true } },
        lineItems: true,
      },
      orderBy: { lastMovedAt: "desc" },
    }),
    db.contact.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    db.user.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true },
    }),
    getWorkspacePipelineColumns(session.user.workspaceId),
    db.product.findMany({
      where: { workspaceId: session.user.workspaceId, deleted: false },
      select: { id: true, name: true, unitPrice: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const dealIds = deals.map((d) => d.id);
  const payments =
    dealIds.length > 0
      ? await db.payment.findMany({
          where: { ...scopePaymentsToSession(apiSession), dealId: { in: dealIds } },
          select: { dealId: true, amount: true },
        })
      : [];
  const paidByDeal = new Map<string, number>();
  for (const p of payments) {
    paidByDeal.set(p.dealId, (paidByDeal.get(p.dealId) ?? 0) + Number(p.amount));
  }

  const openDeals = deals.filter((d) => {
    const col = columns.find((c) => c.key === d.stage);
    return !col?.isWonStage && d.stage !== "LOST";
  });
  const openValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-center gap-2">
        <h2 className="text-xl font-semibold">Pipeline</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {openDeals.length} open · ${openValue.toLocaleString()}
        </span>
      </div>
      <PipelineKanban
        deals={deals.map((d) => ({
          id: d.id,
          title: d.title,
          value: Number(d.value),
          stage: d.stage,
          lastMovedAt: d.lastMovedAt.toISOString(),
          contact: d.contact
            ? {
                id: d.contact.id,
                name: `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim(),
                company: d.contact.company,
              }
            : null,
          assignedTo: d.assignedTo,
          lineItems: d.lineItems.map((li) => ({ productId: li.productId, quantity: li.quantity })),
          paid: canAccessDeal(apiSession, d) ? (paidByDeal.get(d.id) ?? 0) : null,
        }))}
        contacts={contacts.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
        }))}
        users={users}
        columns={columns}
        products={products.map((p) => ({ id: p.id, name: p.name, unitPrice: Number(p.unitPrice) }))}
      />
    </div>
  );
}
