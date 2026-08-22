"use client";

import { Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { ContactStatusOption } from "@/components/contacts/contacts-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function StatusRow({
  status,
  totalStatuses,
  onSave,
  onDelete,
}: {
  status: ContactStatusOption;
  totalStatuses: number;
  onSave: (label: string, color: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(status.label);
  const [color, setColor] = useState(status.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!label.trim()) {
      setError("Name required");
      return;
    }
    setSaving(true);
    await onSave(label.trim(), color);
    setSaving(false);
    setEditing(false);
  }

  async function del() {
    setError("");
    setSaving(true);
    await onDelete();
    setSaving(false);
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-md border p-2">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-7 w-8 shrink-0 cursor-pointer rounded border"
          />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-7 flex-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && save()}
            autoFocus
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
            className="h-7 px-2 text-xs"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: status.color }}
      />
      <span className="flex-1 truncate text-sm">{status.label}</span>
      <button
        onClick={() => setEditing(true)}
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        title="Edit status"
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        onClick={del}
        disabled={saving || totalStatuses <= 1}
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
        title={totalStatuses <= 1 ? "Cannot delete last status" : "Delete status"}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddStatusRow({ onAdd }: { onAdd: (label: string, color: string) => Promise<void> }) {
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
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Add status
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-primary/50 p-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-8 shrink-0 cursor-pointer rounded border"
        />
        <Input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Status name"
          className="h-7 flex-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 flex-1 text-xs" onClick={submit} disabled={saving || !label.trim()}>
          Add
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function ManageStatusesPopover({ statuses }: { statuses: ContactStatusOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listError, setListError] = useState("");

  async function handleSave(id: string, label: string, color: string) {
    const res = await fetch(`/api/contacts/statuses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color }),
    });
    if (res.ok) router.refresh();
  }

  async function handleDelete(id: string) {
    setListError("");
    const res = await fetch(`/api/contacts/statuses/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setListError(json.error ?? "Failed to delete status");
    }
  }

  async function handleAdd(label: string, color: string) {
    const res = await fetch("/api/contacts/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9" title="Manage statuses">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="mb-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Contact statuses
        </p>
        <div className="space-y-1">
          {statuses.map((s) => (
            <StatusRow
              key={s.id}
              status={s}
              totalStatuses={statuses.length}
              onSave={(label, color) => handleSave(s.id, label, color)}
              onDelete={() => handleDelete(s.id)}
            />
          ))}
        </div>
        {listError && <p className="mt-1.5 px-1.5 text-xs text-red-500">{listError}</p>}
        <div className="mt-1 border-t pt-1">
          <AddStatusRow onAdd={handleAdd} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
