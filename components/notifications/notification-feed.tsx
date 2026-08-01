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
import { useState } from "react";

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

const TYPE_ICON: Record<string, React.ReactNode> = {
  TASK:   <CheckSquare className="h-4 w-4 text-blue-500" />,
  DEAL:   <Kanban className="h-4 w-4 text-violet-500" />,
  BOT:    <BotMessageSquare className="h-4 w-4 text-primary" />,
  SYSTEM: <CircleAlert className="h-4 w-4 text-orange-500" />,
  INFO:   <Info className="h-4 w-4 text-muted-foreground" />,
};

function NotifItem({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notif;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const content = (
    <div className="flex min-w-0 flex-1 gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        {TYPE_ICON[notif.type] ?? TYPE_ICON.INFO}
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
  const unread = items.filter((n) => !n.read).length;

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
  }

  async function deleteOne(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "PATCH" });
  }

  async function clearAll() {
    setItems([]);
    await fetch("/api/notifications", { method: "DELETE" });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex shrink-0 items-center justify-between border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-foreground">Notifications</h1>
          <p className="text-xs text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
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
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-card">
          {items.map((n) => (
            <NotifItem key={n.id} notif={n} onRead={markRead} onDelete={deleteOne} />
          ))}
        </div>
      )}
    </div>
  );
}
