"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format, isBefore, startOfDay } from "date-fns";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { PRIORITY_STYLES, patchTask, type TaskRow } from "@/components/tasks/task-meta";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TaskKanbanColumn = {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  isSystem: boolean;
};

function TaskCardView({ task, dragging }: { task: TaskRow; dragging?: boolean }) {
  const overdue =
    task.dueDate &&
    task.status !== "DONE" &&
    isBefore(new Date(task.dueDate), startOfDay(new Date()));

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        dragging && "opacity-90 shadow-lg ring-2 ring-primary/40",
        overdue && "border-l-4 border-l-red-500"
      )}
    >
      <p
        className={cn(
          "text-sm font-medium leading-tight",
          task.status === "DONE" && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[task.priority])}>
            {task.priority}
          </Badge>
          {task.source === "BOT" && (
            <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
              BOT
            </Badge>
          )}
        </div>
        {task.assignedTo && (
          <Avatar className="h-5 w-5">
            <AvatarFallback className="bg-primary-light text-[9px] text-primary">
              {(task.assignedTo.name ?? "?")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {task.dueDate ? (
          <span className={cn(overdue && "font-medium text-red-600")}>
            {format(new Date(task.dueDate), "MMM d, HH:mm")}
          </span>
        ) : (
          <span />
        )}
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
  );
}

function DraggableTask({ task, onClick }: { task: TaskRow; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn("cursor-grab", isDragging && "opacity-30")}
    >
      <TaskCardView task={task} />
    </div>
  );
}

function EditColumnPopover({
  col,
  tasksCount,
  totalColumns,
  onSave,
  onDelete,
  onClose,
}: {
  col: TaskKanbanColumn;
  tasksCount: number;
  totalColumns: number;
  onSave: (label: string, color: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(col.label);
  const [color, setColor] = useState(col.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!label.trim()) { setError("Name required"); return; }
    setSaving(true);
    await onSave(label.trim(), color);
    setSaving(false);
    onClose();
  }

  async function del() {
    if (tasksCount > 0) { setError(`Move ${tasksCount} task(s) first`); return; }
    if (totalColumns <= 1) { setError("Cannot delete last column"); return; }
    setSaving(true);
    await onDelete();
    setSaving(false);
    onClose();
  }

  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border bg-card p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Edit column</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Column name"
          className="h-7 text-sm"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Color</label>
          <input
            type="color"
            value={color.startsWith("var(") ? "#64748B" : color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-10 cursor-pointer rounded border"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-1.5">
          <Button size="sm" className="h-7 flex-1 text-xs" onClick={save} disabled={saving}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={del}
            disabled={saving || totalColumns <= 1}
            title={totalColumns <= 1 ? "Cannot delete last column" : "Delete column"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusColumn({
  col,
  tasks,
  onCardClick,
  onColSave,
  onColDelete,
  totalColumns,
}: {
  col: TaskKanbanColumn;
  tasks: TaskRow[];
  onCardClick: (task: TaskRow) => void;
  onColSave: (id: string, label: string, color: string) => Promise<void>;
  onColDelete: (id: string) => Promise<void>;
  totalColumns: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ borderTopColor: col.color }}
      className={cn(
        "relative flex w-72 shrink-0 flex-col rounded-xl border-t-[3px] bg-muted p-2 transition-colors",
        isOver && "bg-primary/10"
      )}
    >
      <div className="flex items-center gap-2 px-1.5 py-1.5">
        <span className="text-sm font-semibold text-foreground">{col.label}</span>
        <span className="text-xs text-muted-foreground">({tasks.length})</span>
        <button
          onClick={() => setEditOpen((v) => !v)}
          className="ml-auto rounded p-0.5 text-muted-foreground hover:text-foreground"
          title="Edit column"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>

      {editOpen && (
        <EditColumnPopover
          col={col}
          tasksCount={tasks.length}
          totalColumns={totalColumns}
          onSave={(label, color) => onColSave(col.id, label, color)}
          onDelete={() => onColDelete(col.id)}
          onClose={() => setEditOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col gap-2 p-1">
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} onClick={() => onCardClick(task)} />
        ))}
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No tasks</p>
        )}
      </div>
    </div>
  );
}

function AddColumnButton({ onAdd }: { onAdd: (label: string, color: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#64748B");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!label.trim()) return;
    setSaving(true);
    await onAdd(label.trim(), color);
    setSaving(false);
    setLabel("");
    setColor("#64748B");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex h-10 w-56 shrink-0 items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Add column
      </button>
    );
  }

  return (
    <div className="flex w-56 shrink-0 flex-col gap-2 rounded-xl border border-dashed border-primary/50 bg-muted p-3">
      <Input
        ref={inputRef}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Column name"
        className="h-7 text-sm"
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-6 w-10 cursor-pointer rounded border"
        />
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 flex-1 text-xs" onClick={submit} disabled={saving || !label.trim()}>
          Add
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function TaskBoard({
  tasks: initialTasks,
  columns: initialColumns,
  onCardClick,
}: {
  tasks: TaskRow[];
  columns: TaskKanbanColumn[];
  onCardClick: (task: TaskRow) => void;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [columns, setColumns] = useState(initialColumns);
  const [activeTask, setActiveTask] = useState<TaskRow | null>(null);

  const [lastTasksProps, setLastTasksProps] = useState(initialTasks);
  if (initialTasks !== lastTasksProps) {
    setLastTasksProps(initialTasks);
    setTasks(initialTasks);
  }
  const [lastColsProps, setLastColsProps] = useState(initialColumns);
  if (initialColumns !== lastColsProps) {
    setLastColsProps(initialColumns);
    setColumns(initialColumns);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const byStatus = useMemo(() => {
    const map: Record<string, TaskRow[]> = {};
    for (const col of columns) map[col.key] = [];
    for (const task of tasks) {
      if (map[task.status]) map[task.status].push(task);
    }
    return map;
  }, [tasks, columns]);

  function onDragStart(e: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(e.active.id);
    const newStatus = e.over?.id as string | undefined;
    if (!newStatus) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, completed: newStatus === "DONE" } : t
      )
    );

    const res = await patchTask(taskId, { status: newStatus });
    if (!res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t)));
      return;
    }
    router.refresh();
  }

  async function handleColSave(id: string, label: string, color: string) {
    const res = await fetch(`/api/tasks/columns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color }),
    });
    if (res.ok) {
      setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, label, color } : c)));
    }
  }

  async function handleColDelete(id: string) {
    const res = await fetch(`/api/tasks/columns/${id}`, { method: "DELETE" });
    if (res.ok) {
      setColumns((prev) => prev.filter((c) => c.id !== id));
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Failed to delete column");
    }
  }

  async function handleColAdd(label: string, color: string) {
    const res = await fetch("/api/tasks/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color }),
    });
    if (res.ok) {
      const col = await res.json();
      setColumns((prev) => [...prev, col]);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <StatusColumn
            key={col.key}
            col={col}
            tasks={byStatus[col.key] ?? []}
            onCardClick={onCardClick}
            onColSave={handleColSave}
            onColDelete={handleColDelete}
            totalColumns={columns.length}
          />
        ))}
        <AddColumnButton onAdd={handleColAdd} />
      </div>
      <DragOverlay>{activeTask && <TaskCardView task={activeTask} dragging />}</DragOverlay>
    </DndContext>
  );
}
