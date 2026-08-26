import { differenceInDays } from "date-fns";
import { AlertTriangle, Check } from "lucide-react";
import { redirect } from "next/navigation";

import { UpgradeButton } from "@/components/billing/upgrade-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLAN_LIMITS, PLANS, type PlanKey } from "@/lib/stripe";
import { cn } from "@/lib/utils";

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === Infinity ? 0 : Math.min(100, (used / limit) * 100);
  const near = limit !== Infinity && used / limit >= 0.8;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium tabular-nums", near && "text-amber-600")}>
          {used.toLocaleString()} / {limit === Infinity ? "Unlimited" : limit.toLocaleString()}
        </span>
      </div>
      {limit !== Infinity && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", near ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [workspace, usage] = await Promise.all([
    db.workspace.findUnique({ where: { id: session.user.workspaceId } }),
    Promise.all([
      db.contact.count({ where: { workspaceId: session.user.workspaceId } }),
      db.user.count({ where: { workspaceId: session.user.workspaceId } }),
      db.deal.count({ where: { workspaceId: session.user.workspaceId } }),
    ]),
  ]);
  if (!workspace) redirect("/login");

  const [contactCount, userCount, dealCount] = usage;
  const trialDaysLeft = workspace.trialEndsAt
    ? differenceInDays(workspace.trialEndsAt, new Date())
    : null;
  const trialActive = trialDaysLeft !== null && trialDaysLeft >= 0;
  const expired = !workspace.subscriptionActive && trialDaysLeft !== null && trialDaysLeft < 0;

  const currentPlanKey = (Object.keys(PLANS) as PlanKey[]).find(
    (k) => PLANS[k].plan === workspace.plan
  );
  const limits = currentPlanKey ? PLAN_LIMITS[currentPlanKey] : PLAN_LIMITS.starter;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {expired && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Your trial has ended. Pick a plan below to keep using Panelflo — your
            data is safe and waiting.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3 text-base">
            Current plan
            <Badge className="bg-primary-light text-primary-dark" variant="outline">
              {workspace.plan}
            </Badge>
            {workspace.subscriptionActive ? (
              <Badge variant="outline" className="border-primary/40 text-primary">
                Active subscription
              </Badge>
            ) : trialActive ? (
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left in trial
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <UsageBar label="Contacts" used={contactCount} limit={limits.contacts} />
            <UsageBar label="Team members" used={userCount} limit={limits.members} />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{dealCount}</span> deals tracked
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(PLANS) as PlanKey[]).map((key) => {
          const plan = PLANS[key];
          const isCurrent =
            workspace.subscriptionActive && workspace.plan === plan.plan;
          return (
            <Card
              key={key}
              className={cn(
                isCurrent
                  ? "border-primary ring-1 ring-primary"
                  : key === "growth"
                    ? "border-primary shadow-md"
                    : undefined
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between text-base">
                  {plan.name}
                  {isCurrent ? (
                    <Badge className="bg-primary text-white">Current</Badge>
                  ) : (
                    key === "growth" && (
                      <Badge className="bg-primary text-white">Popular</Badge>
                    )
                  )}
                </CardTitle>
                <p>
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <UpgradeButton plan={key} current={isCurrent} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
