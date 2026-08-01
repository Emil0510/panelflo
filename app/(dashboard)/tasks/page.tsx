import { redirect } from "next/navigation";

import { TaskList } from "@/components/tasks/task-list";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceTaskColumns } from "@/lib/columns";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { workspaceId } = session.user;

  const [tasks, users, contacts, deals, columns] = await Promise.all([
    db.task.findMany({
      where: { workspaceId, deleted: false },
      include: {
        assignedTo: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
      take: 500,
    }),
    db.user.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
    db.contact.findMany({
      where: { workspaceId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    db.deal.findMany({
      where: { workspaceId, stage: { notIn: ["WON", "LOST"] } },
      select: { id: true, title: true },
    }),
    getWorkspaceTaskColumns(workspaceId),
  ]);

  return (
    <TaskList
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate?.toISOString() ?? null,
        status: t.status,
        priority: t.priority,
        completed: t.completed,
        source: t.source,
        assignedTo: t.assignedTo,
        contact: t.contact
          ? {
              id: t.contact.id,
              name: `${t.contact.firstName} ${t.contact.lastName ?? ""}`.trim(),
            }
          : null,
        deal: t.deal,
      }))}
      users={users}
      contacts={contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      }))}
      deals={deals}
      currentUserId={session.user.id}
      columns={columns}
    />
  );
}
