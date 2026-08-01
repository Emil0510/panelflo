import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TaskCompleteCheckbox } from "@/components/task-complete-checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { workspaceId } = session.user;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const startOfMonth = new Date(startOfDay);
  startOfMonth.setDate(1);

  const [
    tasksDueToday,
    openDeals,
    contactsThisMonth,
    overdueCount,
    myTasksToday,
    recentActivity,
  ] = await Promise.all([
    db.task.count({
      where: { workspaceId, deleted: false, completed: false, dueDate: { gte: startOfDay, lt: endOfDay } },
    }),
    db.deal.aggregate({
      where: { workspaceId, stage: { notIn: ["WON", "LOST"] } },
      _count: true,
      _sum: { value: true },
    }),
    db.contact.count({ where: { workspaceId, createdAt: { gte: startOfMonth } } }),
    db.task.count({
      where: { workspaceId, deleted: false, completed: false, dueDate: { lt: startOfDay } },
    }),
    db.task.findMany({
      where: {
        workspaceId, deleted: false, completed: false,
        assignedToId: session.user.id,
        dueDate: { gte: startOfDay, lt: endOfDay },
      },
      include: { contact: true },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    db.activity.findMany({
      where: { workspaceId },
      include: { createdBy: true, contact: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const metrics = [
    { label: "Tasks due today", value: String(tasksDueToday), href: "/tasks", accent: false },
    {
      label: "Open deals",
      value: `${openDeals._count} · $${Number(openDeals._sum.value ?? 0).toLocaleString()}`,
      href: "/pipeline",
      accent: false,
    },
    { label: "Contacts this month", value: String(contactsThisMonth), href: "/contacts", accent: false },
    { label: "Tasks overdue", value: String(overdueCount), href: "/tasks", accent: overdueCount > 0 },
  ];

  return (
    // h-full + flex col so this page fills the main container exactly — no page-level scroll
    <div className="flex h-full flex-col gap-4">
      {/* Metric cards — fixed height */}
      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <Link key={m.label} href={m.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {m.accent && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                  {m.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className={`text-2xl font-bold ${m.accent ? "text-red-600" : ""}`}>
                  {m.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Bottom row — flex-1 + min-h-0 so it fills remaining height without overflow */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
        {/* Tasks card */}
        <Card className="flex min-h-0 flex-col lg:col-span-3">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="text-base">My tasks due today</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto pb-4">
            {myTasksToday.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">You&apos;re all caught up today 🎉</p>
              </div>
            ) : (
              <ul className="divide-y">
                {myTasksToday.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 py-3">
                    <TaskCompleteCheckbox taskId={task.id} completed={task.completed} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      {task.contact && (
                        <Link href={`/contacts/${task.contact.id}`} className="text-xs text-primary hover:underline">
                          {task.contact.firstName} {task.contact.lastName ?? ""}
                        </Link>
                      )}
                    </div>
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground">{format(task.dueDate, "HH:mm")}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Activity card */}
        <Card className="flex min-h-0 flex-col lg:col-span-2">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto pb-4">
            {recentActivity.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              </div>
            ) : (
              <ActivityFeed activities={recentActivity} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
