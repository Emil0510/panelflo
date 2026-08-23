import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  DollarSign,
  Package,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AddNoteForm } from "@/components/contacts/add-note-form";
import { AiSummaryButton } from "@/components/contacts/ai-summary-button";
import { ContactFormSheet } from "@/components/contacts/contact-form";
import { TaskCompleteCheckbox } from "@/components/task-complete-checkbox";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getWorkspaceContactColumns } from "@/lib/columns";
import { db } from "@/lib/db";
import { canAccessDeal, scopePaymentsToSession } from "@/lib/payments";

export const dynamic = "force-dynamic";

const ACTIVITY_ICONS = {
  NOTE: Pencil,
  TASK_COMPLETED: CheckCircle2,
  DEAL_MOVED: ArrowRight,
  BOT_MESSAGE: Bot,
  STOCK_MOVEMENT: Package,
  PAYMENT_RECEIVED: DollarSign,
} as const;

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [contact, users, statuses] = await Promise.all([
    db.contact.findFirst({
      where: { id: params.id, workspaceId: session.user.workspaceId },
      include: {
        assignedTo: true,
        deals: { orderBy: { createdAt: "desc" } },
        tasks: {
          where: { deleted: false },
          orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
        },
        activities: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: true },
          take: 50,
        },
      },
    }),
    db.user.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true },
    }),
    getWorkspaceContactColumns(session.user.workspaceId),
  ]);
  if (!contact) notFound();

  const apiSession = {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };

  const dealIds = contact.deals.map((d) => d.id);
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

  const inScopeDealIds = new Set(
    contact.deals.filter((d) => canAccessDeal(apiSession, d)).map((d) => d.id)
  );

  const totalPaid = [...inScopeDealIds].reduce((sum, id) => sum + (paidByDeal.get(id) ?? 0), 0);

  const statusMeta = statuses.find(
    (s: Awaited<ReturnType<typeof getWorkspaceContactColumns>>[number]) => s.key === contact.status
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold">
            {contact.firstName} {contact.lastName ?? ""}
          </h2>
          {contact.company && (
            <p className="text-sm text-muted-foreground">{contact.company}</p>
          )}
        </div>
        <Badge
          variant="outline"
          style={{
            backgroundColor: `${statusMeta?.color ?? "#64748B"}1a`,
            color: statusMeta?.color ?? "#64748B",
            borderColor: "transparent",
          }}
        >
          {statusMeta?.label ?? contact.status}
        </Badge>
        {contact.assignedTo && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary-light text-[10px] text-primary">
                {(contact.assignedTo.name ?? "?")
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            {contact.assignedTo.name}
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <QuickAddTask contactId={contact.id} users={users} />
          <ContactFormSheet
            users={users}
            statuses={statuses}
            initial={{
              id: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName ?? "",
              email: contact.email ?? "",
              phone: contact.phone ?? "",
              company: contact.company ?? "",
              notes: contact.notes ?? "",
              status: contact.status,
              assignedToId: contact.assignedToId ?? "",
            }}
            trigger={
              <Button variant="outline" size="sm">
                Edit
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Email: </span>
                {contact.email ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Phone: </span>
                {contact.phone ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Company: </span>
                {contact.company ?? "—"}
              </p>
              {contact.notes && (
                <p className="whitespace-pre-line border-t pt-2">{contact.notes}</p>
              )}
              <div className="pt-2">
                <AiSummaryButton contactId={contact.id} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Deals ({contact.deals.length})
              </CardTitle>
              {inScopeDealIds.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total paid: ${totalPaid.toLocaleString()} across {inScopeDealIds.size} deal
                  {inScopeDealIds.size === 1 ? "" : "s"}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {contact.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deals linked.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {contact.deals.map((deal) => {
                    const inScope = inScopeDealIds.has(deal.id);
                    const paid = paidByDeal.get(deal.id) ?? 0;
                    const dealValue = Number(deal.value);
                    const paymentStatus = !inScope
                      ? null
                      : dealValue <= 0
                        ? "Paid"
                        : paid <= 0
                          ? "Unpaid"
                          : paid >= dealValue
                            ? "Paid"
                            : "Partial";
                    return (
                      <li key={deal.id} className="flex items-center justify-between py-2">
                        <span>{deal.title}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline">{deal.stage}</Badge>
                          {paymentStatus && (
                            <Badge
                              variant="outline"
                              className={
                                paymentStatus === "Paid"
                                  ? "border-emerald-200 text-emerald-600"
                                  : paymentStatus === "Partial"
                                    ? "border-amber-200 text-amber-600"
                                    : "border-slate-200 text-slate-500"
                              }
                            >
                              {paymentStatus}
                            </Badge>
                          )}
                          <span className="font-medium">
                            ${dealValue.toLocaleString()}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tasks ({contact.tasks.filter((t) => !t.completed).length} open)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks linked.</p>
              ) : (
                <ul className="divide-y">
                  {contact.tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-3 py-2">
                      <TaskCompleteCheckbox taskId={task.id} completed={task.completed} />
                      <span
                        className={`flex-1 text-sm ${task.completed ? "text-muted-foreground line-through" : ""}`}
                      >
                        {task.title}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          {format(task.dueDate, "MMM d")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-4">
                {contact.activities.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.type] ?? Pencil;
                  return (
                    <li key={activity.id} className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm leading-snug">{activity.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.createdBy?.name ?? "Flo"} ·{" "}
                          {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t pt-4">
              <AddNoteForm contactId={contact.id} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
