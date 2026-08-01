"use client";

import { format } from "date-fns";
import {
  AlignLeft,
  CalendarClock,
  Link2,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  PRIORITIES,
  PRIORITY_STYLES,
  STATUS_STYLES,
  type TaskPriority,
  type TaskRow,
  type TaskStatus,
} from "@/components/tasks/task-meta";
import type { TaskKanbanColumn } from "@/components/tasks/task-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FormState = {
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToId: string;
  contactId: string;
  dealId: string;
};

function toForm(task: TaskRow): FormState {
  return {
    title: task.title,
    description: task.description ?? "",
    dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd'T'HH:mm") : "",
    status: task.status,
    priority: task.priority,
    assignedToId: task.assignedTo?.id ?? "",
    contactId: task.contact?.id ?? "",
    dealId: task.deal?.id ?? "",
  };
}

// ─── Property row ─────────────────────────────────────────────────────────────

function PropRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center gap-3">
      <div className="flex w-36 shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <span className="shrink-0 opacity-60">{icon}</span>
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Inline select styled as pill/chip ────────────────────────────────────────

function PillSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-7 w-auto gap-1.5 rounded-full border px-3 text-xs font-medium shadow-none",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export function TaskDetailSheet({
  task,
  onOpenChange,
  users,
  contacts,
  deals,
  columns = [],
}: {
  task: TaskRow | null;
  onOpenChange: (open: boolean) => void;
  users: { id: string; name: string | null }[];
  contacts: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  columns?: TaskKanbanColumn[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (task && task.id !== taskId) {
    setTaskId(task.id);
    setForm(toForm(task));
    setError(null);
  }
  if (!task && taskId !== null) {
    setTaskId(null);
    setForm(null);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function save() {
    if (!task || !form) return;
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        dueDate: form.dueDate || null,
        status: form.status,
        priority: form.priority,
        assignedToId: form.assignedToId || null,
        contactId: form.contactId || null,
        dealId: form.dealId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed to save"); return; }
    onOpenChange(false);
    router.refresh();
  }

  async function remove() {
    if (!task) return;
    setSaving(true);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setSaving(false);
    onOpenChange(false);
    router.refresh();
  }

  const assignedUser = users.find((u) => u.id === form?.assignedToId);
  const linkedContact = contacts.find((c) => c.id === form?.contactId);
  const linkedDeal = deals.find((d) => d.id === form?.dealId);

  return (
    <Sheet open={Boolean(task)} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {form && (
          <>
            {/* ── Header ── */}
            <div className="space-y-3 px-6 pb-4 pt-6">
              {/* Source badge */}
              <div className="flex items-center gap-2">
                {task?.source === "BOT" && (
                  <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                    via bot
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Task
                </span>
              </div>

              {/* Editable title */}
              <textarea
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                rows={2}
                className={cn(
                  "w-full resize-none bg-transparent text-xl font-semibold leading-snug outline-none placeholder:text-muted-foreground/50",
                  "rounded-md px-0 py-0 transition-colors hover:bg-muted/30 focus:bg-muted/40"
                )}
                placeholder="Task title…"
              />

              {/* Status + priority pills */}
              <div className="flex flex-wrap gap-2">
                <PillSelect
                  value={form.status}
                  options={columns.length > 0 ? columns.map((s) => ({ key: s.key, label: s.label })) : [{ key: form.status, label: form.status }]}
                  onChange={(v) => set("status", v as TaskStatus)}
                  className={STATUS_STYLES[form.status] ?? "bg-muted text-muted-foreground"}
                />
                <PillSelect
                  value={form.priority}
                  options={PRIORITIES.map((p) => ({ key: p.key, label: p.label }))}
                  onChange={(v) => set("priority", v as TaskPriority)}
                  className={PRIORITY_STYLES[form.priority]}
                />
              </div>
            </div>

            <Separator />

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
              {/* Properties */}
              <PropRow icon={<User className="h-3.5 w-3.5" />} label="Assigned to">
                <Select
                  value={form.assignedToId || "unassigned"}
                  onValueChange={(v) => set("assignedToId", v === "unassigned" ? "" : v)}
                >
                  <SelectTrigger className="h-8 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-muted/50 focus:ring-0">
                    <SelectValue>
                      {assignedUser ? (
                        <span className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                            {(assignedUser.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </span>
                          {assignedUser.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name ?? "Unnamed"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropRow>

              <PropRow icon={<CalendarClock className="h-3.5 w-3.5" />} label="Due date">
                <Input
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                  className="h-8 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-muted/50 focus-visible:ring-0"
                />
              </PropRow>

              <PropRow icon={<Link2 className="h-3.5 w-3.5" />} label="Contact">
                <Select
                  value={form.contactId || "none"}
                  onValueChange={(v) => set("contactId", v === "none" ? "" : v)}
                >
                  <SelectTrigger className="h-8 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-muted/50 focus:ring-0">
                    <SelectValue>
                      {linkedContact ? (
                        <span>{linkedContact.name}</span>
                      ) : (
                        <span className="text-muted-foreground">No contact</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No contact</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropRow>

              <PropRow icon={<Link2 className="h-3.5 w-3.5" />} label="Deal">
                <Select
                  value={form.dealId || "none"}
                  onValueChange={(v) => set("dealId", v === "none" ? "" : v)}
                >
                  <SelectTrigger className="h-8 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-muted/50 focus:ring-0">
                    <SelectValue>
                      {linkedDeal ? (
                        <span>{linkedDeal.title}</span>
                      ) : (
                        <span className="text-muted-foreground">No deal</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No deal</SelectItem>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropRow>

              <Separator className="my-3" />

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlignLeft className="h-3.5 w-3.5" />
                  Description
                </div>
                <Textarea
                  rows={4}
                  placeholder="Add more detail…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="resize-none border-0 bg-muted/30 text-sm shadow-none focus-visible:ring-1"
                />
              </div>
            </div>

            <Separator />

            {/* ── Footer ── */}
            <div className="flex items-center gap-2 px-6 py-4">
              {error && <p className="flex-1 text-xs text-red-600">{error}</p>}
              {!error && <div className="flex-1" />}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                onClick={remove}
                disabled={saving}
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button onClick={save} disabled={saving} size="sm" className="px-5">
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
