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
import { differenceInDays } from "date-fns";
import { ChevronDown, ChevronRight, Inbox, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { DealFormSheet, type DealFormValues } from "@/components/pipeline/deal-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type KanbanColumn = {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  isSystem: boolean;
};

export type DealCard = {
  id: string;
  title: string;
  value: number;
  stage: string;
  lastMovedAt: string;
  contact: { id: string; name: string; company: string | null } | null;
  assignedTo: { id: string; name: string | null } | null;
};

function DealCardView({
  deal,
  onClick,
  dragging,
}: {
  deal: DealCard;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const daysInStage = differenceInDays(new Date(), new Date(deal.lastMovedAt));
  const staleClass =
    daysInStage > 14
      ? "text-red-600"
      : daysInStage > 7
        ? "text-amber-600"
        : "text-muted-foreground";

  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-grab space-y-1.5 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        dragging && "opacity-90 shadow-lg ring-2 ring-primary/40"
      )}
    >
      <p className="text-sm font-medium leading-tight">
        {deal.contact?.company ?? deal.title}
      </p>
      {deal.contact && (
        <p className="text-xs text-muted-foreground">{deal.contact.name}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary-dark">
          ${deal.value.toLocaleString()}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[11px]", staleClass)}>{daysInStage}d</span>
          {deal.assignedTo && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-primary-light text-[9px] text-primary">
                {(deal.assignedTo.name ?? "?")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableDeal({ deal, onClick }: { deal: DealCard; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-30" : undefined}>
      <DealCardView deal={deal} onClick={onClick} />
    </div>
  );
}

function EditColumnPopover({
  col,
  dealsCount,
  totalColumns,
  onSave,
  onDelete,
  onClose,
}: {
  col: KanbanColumn;
  dealsCount: number;
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
    if (dealsCount > 0) { setError(`Move ${dealsCount} deal(s) first`); return; }
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
            value={color}
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

function StageColumn({
  col,
  deals,
  collapsed,
  onToggle,
  onAdd,
  onCardClick,
  onColSave,
  onColDelete,
  totalColumns,
}: {
  col: KanbanColumn;
  deals: DealCard[];
  collapsed: boolean;
  onToggle?: () => void;
  onAdd: () => void;
  onCardClick: (deal: DealCard) => void;
  onColSave: (id: string, label: string, color: string) => Promise<void>;
  onColDelete: (id: string) => Promise<void>;
  totalColumns: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const [editOpen, setEditOpen] = useState(false);
  const total = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      style={{ borderTopColor: col.color }}
      className={cn(
        "relative flex w-64 shrink-0 flex-col rounded-xl border-t-[3px] bg-muted p-2 transition-colors",
        isOver && "bg-primary/10"
      )}
    >
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        {onToggle && (
          <button onClick={onToggle} className="text-muted-foreground">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
        <span className="text-sm font-semibold text-foreground">{col.label}</span>
        <span className="text-xs text-muted-foreground">({deals.length})</span>
        <span className="ml-auto text-xs font-medium text-muted-foreground">
          ${total.toLocaleString()}
        </span>
        <button
          onClick={() => setEditOpen((v) => !v)}
          className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          title="Edit column"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {editOpen && (
        <EditColumnPopover
          col={col}
          dealsCount={deals.length}
          totalColumns={totalColumns}
          onSave={(label, color) => onColSave(col.id, label, color)}
          onDelete={() => onColDelete(col.id)}
          onClose={() => setEditOpen(false)}
        />
      )}

      {!collapsed && (
        <div className="flex flex-1 flex-col gap-2 p-1">
          {deals.map((deal) => (
            <DraggableDeal key={deal.id} deal={deal} onClick={() => onCardClick(deal)} />
          ))}
          {deals.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center">
              <Inbox className="h-4 w-4 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No deals</p>
            </div>
          )}
        </div>
      )}
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
        className="flex h-10 w-52 shrink-0 items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Add column
      </button>
    );
  }

  return (
    <div className="flex w-52 shrink-0 flex-col gap-2 rounded-xl border border-dashed border-primary/50 bg-muted p-3">
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

export function PipelineKanban({
  deals: initialDeals,
  contacts,
  users,
  columns: initialColumns,
}: {
  deals: DealCard[];
  contacts: { id: string; name: string }[];
  users: { id: string; name: string | null }[];
  columns: KanbanColumn[];
}) {
  const router = useRouter();
  const [deals, setDeals] = useState(initialDeals);
  const [columns, setColumns] = useState(initialColumns);
  const [activeDeal, setActiveDeal] = useState<DealCard | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<DealFormValues>({
    title: "",
    value: "",
    stage: initialColumns[0]?.key ?? "LEAD",
    contactId: "",
    assignedToId: "",
  });

  const [lastDealsProps, setLastDealsProps] = useState(initialDeals);
  if (initialDeals !== lastDealsProps) {
    setLastDealsProps(initialDeals);
    setDeals(initialDeals);
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

  const byStage = useMemo(() => {
    const map: Record<string, DealCard[]> = {};
    for (const col of columns) map[col.key] = [];
    for (const deal of deals) {
      if (map[deal.stage]) map[deal.stage].push(deal);
    }
    return map;
  }, [deals, columns]);

  function onDragStart(e: DragStartEvent) {
    setActiveDeal(deals.find((d) => d.id === e.active.id) ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveDeal(null);
    const dealId = String(e.active.id);
    const newStage = e.over?.id as string | undefined;
    if (!newStage) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, stage: newStage, lastMovedAt: new Date().toISOString() } : d
      )
    );

    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    if (!res.ok) {
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: deal.stage } : d)));
      return;
    }
    router.refresh();
  }

  function openAdd(stage: string) {
    setFormInitial({ title: "", value: "", stage, contactId: "", assignedToId: "" });
    setSheetOpen(true);
  }

  function openEdit(deal: DealCard) {
    setFormInitial({
      id: deal.id,
      title: deal.title,
      value: String(deal.value),
      stage: deal.stage,
      contactId: deal.contact?.id ?? "",
      assignedToId: deal.assignedTo?.id ?? "",
    });
    setSheetOpen(true);
  }

  async function handleColSave(id: string, label: string, color: string) {
    const res = await fetch(`/api/pipeline/columns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color }),
    });
    if (res.ok) {
      setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, label, color } : c)));
    }
  }

  async function handleColDelete(id: string) {
    const res = await fetch(`/api/pipeline/columns/${id}`, { method: "DELETE" });
    if (res.ok) {
      setColumns((prev) => prev.filter((c) => c.id !== id));
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Failed to delete column");
    }
  }

  async function handleColAdd(label: string, color: string) {
    const res = await fetch("/api/pipeline/columns", {
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
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="group flex gap-3 overflow-x-auto pb-4">
          {columns.map((col) => (
            <StageColumn
              key={col.key}
              col={col}
              deals={byStage[col.key] ?? []}
              collapsed={Boolean(collapsed[col.key])}
              onToggle={() => setCollapsed((c) => ({ ...c, [col.key]: !c[col.key] }))}
              onAdd={() => openAdd(col.key)}
              onCardClick={openEdit}
              onColSave={handleColSave}
              onColDelete={handleColDelete}
              totalColumns={columns.length}
            />
          ))}
          <AddColumnButton onAdd={handleColAdd} />
        </div>
        <DragOverlay>
          {activeDeal && <DealCardView deal={activeDeal} dragging />}
        </DragOverlay>
      </DndContext>

      <DealFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={formInitial}
        contacts={contacts}
        users={users}
        columns={columns}
      />
    </>
  );
}
