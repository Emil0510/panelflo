import Image from "next/image";
import { redirect } from "next/navigation";

import { SidebarNav } from "@/components/sidebar-nav";
import { Topbar } from "@/components/topbar";
import { UserMenu } from "@/components/user-menu";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unreadNotifications = await db.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-[18px]">
          <Image
            src="/icon-light.svg"
            alt="Panelflo"
            width={28}
            height={28}
            className="block dark:hidden rounded-lg"
          />
          <Image
            src="/icon-dark.svg"
            alt="Panelflo"
            width={28}
            height={28}
            className="hidden dark:block rounded-lg"
          />
          <span className="text-[15px] font-bold tracking-tight text-foreground">
            Panelflo
          </span>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>

        {/* User */}
        <UserMenu
          name={session.user.name ?? "User"}
          email={session.user.email ?? ""}
          plan={session.workspace.plan}
        />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar unreadNotifications={unreadNotifications} />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
