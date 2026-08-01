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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"} in your workspace
        </p>
        {isAdmin && <InviteMemberForm />}
      </div>

      <MemberTable members={members} currentUserId={session.user.id} isAdmin={isAdmin} />
    </div>
  );
}
