"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  BotMessageSquare,
  CheckCheck,
  CircleAlert,
  Info,
  Kanban,
  CheckSquare,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: Date;
};

const TYPES = ["TASK", "DEAL", "BOT", "SYSTEM", "INFO"] as const;

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; badgeClass: string }> = {
  TASK: {
    icon: <CheckSquare className="h-4 w-4" />,
    label: "Task",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  DEAL: {
    icon: <Kanban className="h-4 w-4" />,
    label: "Deal",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  BOT: {
    icon: <BotMessageSquare className="h-4 w-4" />,
    label: "Bot",
    badgeClass: "bg-primary-light text-primary",
  },
  SYSTEM: {
    icon: <CircleAlert className="h-4 w-4" />,
    label: "System",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
  INFO: {
    icon: <Info className="h-4 w-4" />,
    label: "Info",
    badgeClass: "bg-muted text-muted-foreground",
  },
};

const UNDO_WINDOW_MS = 4000;

function NotifItem({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notif;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = TYPE_META[notif.type] ?? TYPE_META.INFO;
  const content = (
    <div className="flex min-w-0 flex-1 gap-3">
      <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", meta.badgeClass)}>
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-sm leading-snug",
          !notif.read ? "font-semibold text-foreground" : "text-muted-foreground"
        )}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notif.body}</p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );

  return (
    <div className={cn(
      "group relative flex items-start gap-2 border-b px-6 py-4 transition-colors last:border-0",
      !notif.read ? "bg-primary/[0.04]" : "hover:bg-muted/40"
    )}>
      {!notif.read && (
        <span className="absolute left-2 top-5 h-1.5 w-1.5 rounded-full bg-primary" />
      )}

      {notif.link ? (
        <Link href={notif.link} className="flex-1 min-w-0" onClick={() => onRead(notif.id)}>
          {content}
        </Link>
      ) : (
        <div className="flex-1 min-w-0">{content}</div>
      )}

      <div className="flex shrink-0 gap-1 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {!notif.read && (
          <button
            onClick={() => onRead(notif.id)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Mark as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id)}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
          title="Delete"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function NotificationFeed({ notifications: initial }: { notifications: Notif[] }) {
  const [items, setItems] = useState<Notif[]>(initial);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const unread = items.filter((n) => !n.read).length;
  const visible = useMemo(
    () => (typeFilter ? items.filter((n) => n.type === typeFilter) : items),
    [items, typeFilter]
  );
  const presentTypes = useMemo(() => new Set(items.map((n) => n.type)), [items]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
  }

  function deleteOne(id: string) {
    const removed = items.find((n) => n.id === id);
    if (!removed) return;

    setItems((prev) => prev.filter((n) => n.id !== id));
    let undone = false;

    toast(`"${removed.title}" deleted`, {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          setItems((prev) =>
            prev.some((n) => n.id === id)
              ? prev
              : [...prev, removed].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          );
        },
      },
      // Only fires if the toast expired on its own — an Undo click dismisses
      // it via the action instead, so the real delete never races the undo.
      onAutoClose: () => {
        if (!undone) fetch(`/api/notifications/${id}`, { method: "DELETE" });
      },
    });
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "PATCH" });
  }

  function clearAll() {
    const snapshot = items;
    if (snapshot.length === 0) return;

    setItems([]);
    let undone = false;

    toast(`${snapshot.length} notification${snapshot.length === 1 ? "" : "s"} cleared`, {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          setItems(snapshot);
        },
      },
      onAutoClose: () => {
        if (!undone) fetch("/api/notifications", { method: "DELETE" });
      },
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-4">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-foreground">Notifications</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {items.length}
          </span>
          {unread > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {unread} unread
            </span>
          )}
        </div>
        {items.length > 0 && (
          <div className="flex gap-2">
            {unread > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-xs text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Type filter chips */}
      {items.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-card px-6 py-2.5">
          <button
            onClick={() => setTypeFilter(null)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              typeFilter === null ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {TYPES.filter((t) => presentTypes.has(t)).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter((cur) => (cur === t ? null : t))}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                typeFilter === t ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Bell className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">No notifications</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;re all caught up. We&apos;ll notify you when something happens.
            </p>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Bell className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">No {TYPE_META[typeFilter!]?.label.toLowerCase()} notifications</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different filter.</p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-card">
          {visible.map((n) => (
            <NotifItem key={n.id} notif={n} onRead={markRead} onDelete={deleteOne} />
          ))}
        </div>
      )}
    </div>
  );
}
