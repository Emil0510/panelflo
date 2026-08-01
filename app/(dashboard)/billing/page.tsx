import { differenceInDays } from "date-fns";
import { Check } from "lucide-react";
import { redirect } from "next/navigation";

import { UpgradeButton } from "@/components/billing/upgrade-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, type PlanKey } from "@/lib/stripe";

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {expired && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Your trial has ended. Pick a plan below to keep using Panelflo — your
          data is safe and waiting.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base">
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
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-2xl font-bold">{contactCount}</p>
            <p className="text-muted-foreground">contacts</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{userCount}</p>
            <p className="text-muted-foreground">team members</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{dealCount}</p>
            <p className="text-muted-foreground">deals</p>
          </div>
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
              className={
                key === "growth" ? "border-primary shadow-md" : undefined
              }
            >
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between text-base">
                  {plan.name}
                  {key === "growth" && (
                    <Badge className="bg-primary text-white">Popular</Badge>
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
