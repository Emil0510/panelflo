"use client";

import { format, isBefore, isToday, startOfDay } from "date-fns";
import {
  ChevronDown,
  Filter,
  Kanban,
  List,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { TaskCompleteCheckbox } from "@/components/task-complete-checkbox";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import {
  PRIORITIES,
  PRIORITY_STYLES,
  STATUS_STYLES,
  patchTask,
  type TaskPriority,
  type TaskRow,
  type TaskStatus,
} from "@/components/tasks/task-meta";
import type { TaskKanbanColumn } from "@/components/tasks/task-board";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Group = "Overdue" | "Today" | "Upcoming" | "No due date" | "Completed";

function groupOf(task: TaskRow): Group {
  if (task.completed) return "Completed";
  if (!task.dueDate) return "No due date";
  const due = new Date(task.dueDate);
  if (isToday(due)) return "Today";
  if (isBefore(due, startOfDay(new Date()))) return "Overdue";
  return "Upcoming";
}

const GROUP_ORDER: Group[] = ["Overdue", "Today", "Upcoming", "No due date", "Completed"];

// ─── Filter types ───────────────────────────────────────────────────────────

type FilterType = "status" | "priority" | "assignee" | "due";

interface ActiveFilter {
  type: FilterType;
  value: string; // for status/priority/assignee: the key; for due: "before:<date>" | "after:<date>"
  label: string; // human readable
}

// ─── FilterBar ───────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  onAdd,
  onRemove,
  onClear,
  users,
  columns,
}: {
  filters: ActiveFilter[];
  onAdd: (f: ActiveFilter) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  users: { id: string; name: string | null }[];
  columns: TaskKanbanColumn[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<FilterType | null>(null);

  function addFilter(type: FilterType, value: string, label: string) {
    onAdd({ type, value, label });
    setStep(null);
    setOpen(false);
  }

  const alreadyStatus = filters.filter((f) => f.type === "status").map((f) => f.value);
  const alreadyPriority = filters.filter((f) => f.type === "priority").map((f) => f.value);
  const alreadyAssignee = filters.filter((f) => f.type === "assignee").map((f) => f.value);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Active filter chips */}
      {filters.map((f, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium",
            f.type === "status" && "border-blue-200 bg-blue-50 text-blue-700",
            f.type === "priority" && "border-orange-200 bg-orange-50 text-orange-700",
            f.type === "assignee" && "border-violet-200 bg-violet-50 text-violet-700",
            f.type === "due" && "border-green-200 bg-green-50 text-green-700"
          )}
        >
          <span className="capitalize text-[10px] opacity-60">
            {f.type === "due" ? "due" : f.type}:
          </span>
          {f.label}
          <button
            onClick={() => onRemove(i)}
            className="ml-0.5 rounded-full p-0.5 opacity-60 hover:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {/* Add filter popover */}
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setStep(null);
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 border-dashed text-xs">
            <Filter className="h-3 w-3" />
            Add filter
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-1" align="start">
          {step === null && (
            <>
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Filter by
              </p>
              {(["status", "priority", "assignee", "due"] as FilterType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setStep(t)}
                  className="flex w-full items-center rounded px-2 py-1.5 text-sm capitalize hover:bg-accent"
                >
                  {t === "due" ? "Due date" : t}
                </button>
              ))}
            </>
          )}

          {step === "status" && (
            <>
              <button
                onClick={() => setStep(null)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ← Status
              </button>
              <Separator className="my-1" />
              {columns.filter((s) => !alreadyStatus.includes(s.key)).map((s) => (
                <button
                  key={s.key}
                  onClick={() => addFilter("status", s.key, s.label)}
                  className="flex w-full items-center rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  {s.label}
                </button>
              ))}
            </>
          )}

          {step === "priority" && (
            <>
              <button
                onClick={() => setStep(null)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ← Priority
              </button>
              <Separator className="my-1" />
              {PRIORITIES.filter((p) => !alreadyPriority.includes(p.key)).map((p) => (
                <button
                  key={p.key}
                  onClick={() => addFilter("priority", p.key, p.label)}
                  className="flex w-full items-center rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  {p.label}
                </button>
              ))}
            </>
          )}

          {step === "assignee" && (
            <>
              <button
                onClick={() => setStep(null)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ← Assignee
              </button>
              <Separator className="my-1" />
              {!alreadyAssignee.includes("unassigned") && (
                <button
                  onClick={() => addFilter("assignee", "unassigned", "Unassigned")}
                  className="flex w-full items-center rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  Unassigned
                </button>
              )}
              {users
                .filter((u) => !alreadyAssignee.includes(u.id))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => addFilter("assignee", u.id, u.name ?? "Unnamed")}
                    className="flex w-full items-center rounded px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    {u.name ?? "Unnamed"}
                  </button>
                ))}
            </>
          )}

          {step === "due" && (
            <>
              <button
                onClick={() => setStep(null)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ← Due date
              </button>
              <Separator className="my-1" />
              <DueDatePicker
                onPick={(type, date) => {
                  const label = type === "before" ? `before ${date}` : `after ${date}`;
                  addFilter("due", `${type}:${date}`, label);
                }}
              />
            </>
          )}
        </PopoverContent>
      </Popover>

      {filters.length > 1 && (
        <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground">
          Clear all
        </button>
      )}
    </div>
  );
}

function DueDatePicker({ onPick }: { onPick: (type: "before" | "after", date: string) => void }) {
  const [date, setDate] = useState("");
  const [type, setType] = useState<"before" | "after">("before");

  return (
    <div className="space-y-2 px-2 py-1.5">
      <div className="flex gap-1.5">
        {(["before", "after"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              "flex-1 rounded border px-2 py-1 text-xs capitalize",
              type === t ? "border-primary bg-primary text-white" : "hover:bg-accent"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="h-8 text-xs"
      />
      <Button
        size="sm"
        className="w-full h-7 text-xs"
        disabled={!date}
        onClick={() => onPick(type, date)}
      >
        Apply
      </Button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyFilters(tasks: TaskRow[], filters: ActiveFilter[], search: string): TaskRow[] {
  let list = tasks;

  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(q));
  }

  for (const f of filters) {
    if (f.type === "status") {
      list = list.filter((t) => t.status === f.value);
    } else if (f.type === "priority") {
      list = list.filter((t) => t.priority === f.value);
    } else if (f.type === "assignee") {
      if (f.value === "unassigned") {
        list = list.filter((t) => !t.assignedTo);
      } else {
        list = list.filter((t) => t.assignedTo?.id === f.value);
      }
    } else if (f.type === "due") {
      const [kind, date] = f.value.split(":");
      list = list.filter((t) => {
        if (!t.dueDate) return false;
        const d = t.dueDate.slice(0, 10);
        return kind === "before" ? d <= date : d >= date;
      });
    }
  }

  return list;
}

// ─── StatusSelect ─────────────────────────────────────────────────────────────

function StatusSelect({ task, columns }: { task: TaskRow; columns: TaskKanbanColumn[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function change(status: TaskStatus) {
    setPending(true);
    await patchTask(task.id, { status });
    setPending(false);
    router.refresh();
  }

  return (
    <Select value={task.status} onValueChange={(v) => change(v)} disabled={pending}>
      <SelectTrigger
        className={cn(
          "h-6 w-auto gap-1 rounded-full border-0 px-2.5 text-[11px] font-medium",
          STATUS_STYLES[task.status] ?? "bg-muted text-muted-foreground"
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {columns.map((s) => (
          <SelectItem key={s.key} value={s.key}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── TaskItem ─────────────────────────────────────────────────────────────────

function TaskItem({ task, onOpen, columns }: { task: TaskRow; onOpen: () => void; columns: TaskKanbanColumn[] }) {
  const router = useRouter();
  const overdue = groupOf(task) === "Overdue";

  async function remove() {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <li
      onClick={onOpen}
      className={cn(
        "group flex cursor-pointer flex-wrap items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-shadow hover:shadow-sm",
        overdue && "border-l-4 border-l-red-500"
      )}
    >
      <span onClick={(e) => e.stopPropagation()}>
        <TaskCompleteCheckbox taskId={task.id} completed={task.completed} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            task.completed && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.dueDate && <span>{format(new Date(task.dueDate), "MMM d, HH:mm")}</span>}
          {task.contact && (
            <Link
              href={`/contacts/${task.contact.id}`}
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {task.contact.name}
            </Link>
          )}
        </div>
      </div>
      <span onClick={(e) => e.stopPropagation()}>
        <StatusSelect task={task} columns={columns} />
      </span>
      <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[task.priority])}>
        {task.priority}
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px]",
          task.source === "BOT" && "border-primary/40 text-primary"
        )}
      >
        {task.source}
      </Badge>
      {task.assignedTo && (
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-primary-light text-[10px] text-primary">
            {(task.assignedTo.name ?? "?")
              .split(" ")
              .map((n: string) => n[0])
              .slice(0, 2)
              .join("")}
          </AvatarFallback>
        </Avatar>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          remove();
        }}
        title="Delete task"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </li>
  );
}

// ─── InlineAddForm ────────────────────────────────────────────────────────────

function InlineAddForm({
  users,
  contacts,
  deals,
  columns,
}: {
  users: { id: string; name: string | null }[];
  contacts: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  columns: TaskKanbanColumn[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>(columns[0]?.key ?? "TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState("");
  const [contactId, setContactId] = useState("");
  const [dealId, setDealId] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        dueDate: dueDate || null,
        status,
        priority,
        assignedToId: assignedToId || null,
        contactId: contactId || null,
        dealId: dealId || null,
      }),
    });
    setSaving(false);
    setTitle("");
    setDescription("");
    setDueDate("");
    setStatus(columns[0]?.key ?? "TODO");
    setPriority("MEDIUM");
    setExpanded(false);
    router.refresh();
  }

  if (!expanded) {
    return (
      <Button onClick={() => setExpanded(true)} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Task
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-lg border bg-card p-3">
      <Input
        autoFocus
        placeholder="Task title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Input
          type="datetime-local"
          className="h-9 w-52"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Select value={status} onValueChange={(v) => setStatus(v)}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columns.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={assignedToId || "unassigned"}
          onValueChange={(v) => setAssignedToId(v === "unassigned" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Assign to" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? "Unnamed"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={contactId || "none"}
          onValueChange={(v) => setContactId(v === "none" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Link contact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No contact</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={dealId || "none"}
          onValueChange={(v) => setDealId(v === "none" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Link deal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No deal</SelectItem>
            {deals.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving || !title.trim()}>
          {saving ? "Adding…" : "Add task"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── TaskList ─────────────────────────────────────────────────────────────────

export function TaskList({
  tasks,
  users,
  contacts,
  deals,
  currentUserId,
  columns,
}: {
  tasks: TaskRow[];
  users: { id: string; name: string | null }[];
  contacts: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  currentUserId: string;
  columns: TaskKanbanColumn[];
}) {
  const [view, setView] = useState<"mine" | "all">("mine");
  const [mode, setMode] = useState<"linear" | "kanban">("linear");
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ActiveFilter[]>([]);

  // Step 1: mine/all split
  const viewTasks = useMemo(
    () =>
      view === "mine"
        ? tasks.filter((t) => t.assignedTo?.id === currentUserId || !t.assignedTo)
        : tasks,
    [tasks, view, currentUserId]
  );

  // Step 2: apply filters + search
  const visible = useMemo(
    () => applyFilters(viewTasks, filters, search),
    [viewTasks, filters, search]
  );

  const grouped = useMemo(() => {
    const map = new Map<Group, TaskRow[]>();
    for (const group of GROUP_ORDER) map.set(group, []);
    for (const task of visible) map.get(groupOf(task))!.push(task);
    return map;
  }, [visible]);

  const byAssignee = useMemo(() => {
    if (view !== "all") return null;
    const map = new Map<string, { name: string; tasks: TaskRow[] }>();
    for (const task of visible) {
      const key = task.assignedTo?.id ?? "unassigned";
      const name = task.assignedTo?.name ?? "Unassigned";
      if (!map.has(key)) map.set(key, { name, tasks: [] });
      map.get(key)!.tasks.push(task);
    }
    for (const entry of map.values()) {
      entry.tasks.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
    }
    return map;
  }, [visible, view]);

  const hasFilters = filters.length > 0 || search.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={(v) => setView(v as "mine" | "all")}>
          <TabsList>
            <TabsTrigger value="mine">My Tasks</TabsTrigger>
            <TabsTrigger value="all">All Team Tasks</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "linear" | "kanban")}>
          <TabsList>
            <TabsTrigger value="linear" className="gap-1.5">
              <List className="h-3.5 w-3.5" />
              Linear
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5">
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto">
          <InlineAddForm users={users} contacts={contacts} deals={deals} columns={columns} />
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-52 pl-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <FilterBar
          filters={filters}
          onAdd={(f) => setFilters((prev) => [...prev, f])}
          onRemove={(i) => setFilters((prev) => prev.filter((_, idx) => idx !== i))}
          onClear={() => setFilters([])}
          users={users}
          columns={columns}
        />

        {hasFilters && (
          <span className="text-xs text-muted-foreground">
            {visible.length} result{visible.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <TaskDetailSheet
        task={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        users={users}
        contacts={contacts}
        deals={deals}
        columns={columns}
      />

      {mode === "kanban" ? (
        <TaskBoard tasks={visible} columns={columns} onCardClick={setSelected} />
      ) : view === "mine" ? (
        <div className="space-y-6">
          {GROUP_ORDER.map((group) => {
            const items = grouped.get(group)!;
            if (items.length === 0) return null;
            return (
              <div key={group} className="space-y-2">
                <h3
                  className={cn(
                    "text-sm font-semibold",
                    group === "Overdue" && "text-red-600"
                  )}
                >
                  {group} ({items.length})
                </h3>
                <ul className="space-y-2">
                  {items.map((task) => (
                    <TaskItem key={task.id} task={task} onOpen={() => setSelected(task)} columns={columns} />
                  ))}
                </ul>
              </div>
            );
          })}
          {visible.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {hasFilters ? "No tasks match the current filters." : "You're all caught up 🎉"}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {byAssignee &&
            [...byAssignee.entries()].map(([key, { name, tasks: items }]) => (
              <div key={key} className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {name} ({items.filter((t) => !t.completed).length} open)
                </h3>
                <ul className="space-y-2">
                  {items.map((task) => (
                    <TaskItem key={task.id} task={task} onOpen={() => setSelected(task)} columns={columns} />
                  ))}
                </ul>
              </div>
            ))}
          {visible.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {hasFilters ? "No tasks match the current filters." : "No team tasks yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
