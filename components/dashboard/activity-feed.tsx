"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Bot, CheckCircle2, Mail, Package, Pencil, Shield, User } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const ACTIVITY_ICONS = {
  NOTE: Pencil,
  TASK_COMPLETED: CheckCircle2,
  DEAL_MOVED: ArrowRight,
  BOT_MESSAGE: Bot,
  STOCK_MOVEMENT: Package,
} as const;

type ActivityItem = {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    image: string | null;
    createdAt: Date;
  } | null;
  contact: { id: string; firstName: string; lastName: string | null } | null;
};

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function MemberSheet({
  member,
  activities,
  open,
  onClose,
}: {
  member: NonNullable<ActivityItem["createdBy"]>;
  activities: ActivityItem[];
  open: boolean;
  onClose: () => void;
}) {
  const memberActivities = activities.filter((a) => a.createdBy?.id === member.id);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-[360px] flex-col gap-0 p-0 sm:max-w-[360px]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b p-5 pr-12">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary-light text-base font-semibold text-primary">
              {initials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{member.name ?? "Unknown"}</p>
            <Badge variant="outline" className="mt-0.5 text-[10px] uppercase">
              {member.role}
            </Badge>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 border-b p-5">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-foreground">{member.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-foreground capitalize">{member.role.toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              Joined {formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Recent activity by this member */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent activity ({memberActivities.length})
          </p>
          <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {memberActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded.</p>
            ) : (
              memberActivities.map((a) => {
                const Icon = ACTIVITY_ICONS[a.type as keyof typeof ACTIVITY_ICONS] ?? Pencil;
                return (
                  <li key={a.id} className="flex gap-2.5">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light">
                      <Icon className="h-3 w-3 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{a.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const [selectedMember, setSelectedMember] = useState<NonNullable<ActivityItem["createdBy"]> | null>(null);

  return (
    <>
      <ul className="space-y-4">
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] ?? Pencil;
          return (
            <li
              key={activity.id}
              className="flex cursor-pointer gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/60"
              onClick={() => activity.createdBy && setSelectedMember(activity.createdBy)}
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">{activity.content}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.createdBy?.name ?? "Flo"} ·{" "}
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
              {activity.createdBy && (
                <Avatar className="mt-0.5 h-5 w-5 shrink-0">
                  <AvatarFallback className="bg-muted text-[9px] text-muted-foreground">
                    {initials(activity.createdBy.name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </li>
          );
        })}
      </ul>

      {selectedMember && (
        <MemberSheet
          member={selectedMember}
          activities={activities}
          open={Boolean(selectedMember)}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}
