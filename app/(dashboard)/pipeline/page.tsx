import { redirect } from "next/navigation";

import { PipelineKanban } from "@/components/pipeline/kanban";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspacePipelineColumns } from "@/lib/columns";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [deals, contacts, users, columns] = await Promise.all([
    db.deal.findMany({
      where: { workspaceId: session.user.workspaceId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        assignedTo: { select: { id: true, name: true } },
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
  ]);

  return (
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
      }))}
      contacts={contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      }))}
      users={users}
      columns={columns}
    />
  );
}
