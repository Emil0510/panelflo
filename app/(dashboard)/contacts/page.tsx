import { redirect } from "next/navigation";

import { ContactsTable } from "@/components/contacts/contacts-table";
import { auth } from "@/lib/auth";
import { getWorkspaceContactColumns } from "@/lib/columns";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [contacts, users, statuses] = await Promise.all([
    db.contact.findMany({
      where: { workspaceId: session.user.workspaceId },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true },
    }),
    getWorkspaceContactColumns(session.user.workspaceId),
  ]);

  return (
    <div className="flex h-full flex-col">
    <ContactsTable
      contacts={contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        company: c.company,
        status: c.status,
        assignedTo: c.assignedTo,
      }))}
      users={users}
      statuses={statuses}
    />
    </div>
  );
}
