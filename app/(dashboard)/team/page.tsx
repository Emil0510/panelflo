import { redirect } from "next/navigation";

import { InviteMemberForm } from "@/components/team/invite-member-form";
import { MemberTable } from "@/components/team/member-table";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const members = await db.user.findMany({
    where: { workspaceId: session.user.workspaceId },
    include: {
      botSessions: true,
      _count: { select: { assignedTasks: { where: { deleted: false, completed: false } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const adminCount = members.filter((m) => m.role === "ADMIN").length;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {adminCount} admin{adminCount === 1 ? "" : "s"}
          </span>
        </div>
        {isAdmin && <InviteMemberForm />}
      </div>

      <MemberTable members={members} currentUserId={session.user.id} isAdmin={isAdmin} />
    </div>
  );
}
