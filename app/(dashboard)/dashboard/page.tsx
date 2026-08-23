import { format } from "date-fns";
import { AlertTriangle, CheckSquare, Clock, Contact, Kanban } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { PipelineChart, RevenueChart } from "@/components/dashboard/dashboard-charts";
import { getWorkspacePipelineColumns } from "@/lib/columns";
import { TaskCompleteCheckbox } from "@/components/task-complete-checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scopePaymentsToSession } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { workspaceId } = session.user;
  const apiSession = {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const startOfMonth = new Date(startOfDay);
  startOfMonth.setDate(1);
  // UTC-anchored, independent of the local-time boundaries above — payments
  // bucket by paidAt's UTC date string, so the 30-day window must too, or
  // the label for "today" never lines up with the local server's midnight.
  const nowUTC = new Date();
  const todayUTC = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate()));
  const thirtyDaysAgo = new Date(todayUTC);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

  const [
    tasksDueToday,
    openDeals,
    contactsThisMonth,
    overdueCount,
    myTasksToday,
    recentActivity,
    pipelineColumns,
    dealsByStage,
    recentPayments,
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
    getWorkspacePipelineColumns(workspaceId),
    db.deal.groupBy({
      by: ["stage"],
      where: { workspaceId },
      _count: true,
      _sum: { value: true },
    }),
    db.payment.findMany({
      where: { ...scopePaymentsToSession(apiSession), paidAt: { gte: thirtyDaysAgo } },
      select: { paidAt: true, amount: true },
    }),
  ]);

  const stageTotals = new Map(dealsByStage.map((s) => [s.stage, s]));
  const pipelineData = pipelineColumns.map((col) => ({
    key: col.key,
    label: col.label,
    color: col.color,
    count: stageTotals.get(col.key)?._count ?? 0,
    value: Number(stageTotals.get(col.key)?._sum.value ?? 0),
  }));

  const revenueByDay = new Map<string, number>();
  for (const p of recentPayments) {
    const day = p.paidAt.toISOString().slice(0, 10);
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + Number(p.amount));
  }
  const revenueData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(thirtyDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, total: revenueByDay.get(key) ?? 0 };
  });

  const metrics = [
    { label: "Tasks due today", value: String(tasksDueToday), href: "/tasks", icon: CheckSquare, accent: false },
    {
      label: "Open deals",
      value: `${openDeals._count} · $${Number(openDeals._sum.value ?? 0).toLocaleString()}`,
      href: "/pipeline",
      icon: Kanban,
      accent: false,
    },
    { label: "Contacts this month", value: String(contactsThisMonth), href: "/contacts", icon: Contact, accent: false },
    { label: "Tasks overdue", value: String(overdueCount), href: "/tasks", icon: Clock, accent: overdueCount > 0 },
  ];

  return (
    // h-full + flex col so this page fills the main container exactly — no page-level scroll
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Metric cards */}
      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <Link key={m.label} href={m.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    m.accent ? "bg-red-50 text-red-600" : "bg-primary-light text-primary"
                  }`}
                >
                  {m.accent ? <AlertTriangle className="h-4.5 w-4.5" /> : <m.icon className="h-4.5 w-4.5" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-muted-foreground">{m.label}</p>
                  <p className={`text-xl font-bold ${m.accent ? "text-red-600" : ""}`}>{m.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid shrink-0 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue — last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="h-56 pb-4">
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-56 pb-4">
            <PipelineChart data={pipelineData} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid min-h-[320px] flex-1 gap-4 lg:grid-cols-5">
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
