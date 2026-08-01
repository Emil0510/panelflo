"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Mail,
  Minus,
  Pencil,
  Shield,
  User,
} from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RemoveMemberButton } from "@/components/team/remove-member-button";

const ACTIVITY_ICONS = {
  NOTE: Pencil,
  TASK_COMPLETED: CheckCircle2,
  DEAL_MOVED: ArrowRight,
  BOT_MESSAGE: Bot,
} as const;

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  botSessions: { platform: string }[];
  _count: { assignedTasks: number };
};

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function BotStatus({ connected }: { connected: boolean }) {
  return connected ? (
    <Check className="h-4 w-4 text-primary" />
  ) : (
    <Minus className="h-4 w-4 text-slate-300" />
  );
}

type DetailData = {
  member: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: string;
    botSessions: { platform: string }[];
    _count: { assignedTasks: number; assignedDeals: number };
  };
  activities: {
    id: string;
    type: string;
    content: string;
    createdAt: string;
    contact: { id: string; firstName: string; lastName: string | null } | null;
  }[];
};

function MemberSheet({
  memberId,
  open,
  onClose,
}: {
  memberId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(id: string) {
    setLoading(true);
    setData(null);
    const res = await fetch(`/api/team/members/${id}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  // Trigger fetch when sheet opens
  if (open && memberId && !loading && !data) load(memberId);
  if (!open && data) setData(null);

  const m = data?.member;
  const telegram = m?.botSessions.some((s) => s.platform === "TELEGRAM");
  const whatsapp = m?.botSessions.some((s) => s.platform === "WHATSAPP");

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-[380px] flex-col gap-0 p-0 sm:max-w-[380px]">
        {loading && (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        )}

        {m && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b p-5 pr-12">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary-light text-base font-semibold text-primary">
                  {initials(m.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{m.name ?? "Unknown"}</p>
                <Badge
                  variant="outline"
                  className={`mt-0.5 text-[10px] uppercase ${m.role === "ADMIN" ? "border-primary/40 text-primary" : ""}`}
                >
                  {m.role}
                </Badge>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2.5 border-b p-5">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{m.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="capitalize">{m.role.toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Joined {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 border-b p-5">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{m._count.assignedTasks}</p>
                <p className="text-xs text-muted-foreground">Open tasks</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{m._count.assignedDeals}</p>
                <p className="text-xs text-muted-foreground">Active deals</p>
              </div>
            </div>

            {/* Bot connections */}
            <div className="flex gap-4 border-b px-5 py-4">
              <div className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Telegram</span>
                {telegram ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">WhatsApp</span>
                {whatsapp ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Activity */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent activity ({data!.activities.length})
              </p>
              <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {data!.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  data!.activities.map((a) => {
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function MemberTable({
  members,
  currentUserId,
  isAdmin = false,
}: {
  members: Member[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Open tasks</TableHead>
              <TableHead className="text-center">Telegram</TableHead>
              <TableHead className="text-center">WhatsApp</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const telegram = member.botSessions.some((s) => s.platform === "TELEGRAM");
              const whatsapp = member.botSessions.some((s) => s.platform === "WHATSAPP");
              return (
                <TableRow
                  key={member.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedId(member.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary-light text-xs text-primary">
                          {initials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={member.role === "ADMIN" ? "border-primary/40 text-primary" : ""}
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(member.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm">{member._count.assignedTasks}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <BotStatus connected={telegram} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <BotStatus connected={whatsapp} />
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isAdmin && member.id !== currentUserId && (
                      <RemoveMemberButton
                        userId={member.id}
                        name={member.name ?? "this member"}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <MemberSheet
        memberId={selectedId}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
