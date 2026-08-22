"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { ContactStatusOption } from "@/components/contacts/contacts-table";

export type WorkspaceUser = { id: string; name: string | null };

export type ContactFormValues = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  status: string;
  assignedToId: string;
};

const EMPTY: ContactFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
  status: "LEAD",
  assignedToId: "",
};

export function ContactFormSheet({
  users,
  statuses,
  initial,
  trigger,
}: {
  users: WorkspaceUser[];
  statuses: ContactStatusOption[];
  initial?: ContactFormValues;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ContactFormValues>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ContactFormValues>(key: K, val: ContactFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function save() {
    if (!values.firstName.trim()) {
      setError("First name is required");
      return;
    }
    setSaving(true);
    setError(null);

    const isEdit = Boolean(values.id);
    const res = await fetch(
      isEdit ? `/api/contacts/${values.id}` : "/api/contacts",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          assignedToId: values.assignedToId || null,
        }),
      }
    );
    setSaving(false);

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to save contact");
      return;
    }
    setOpen(false);
    if (!isEdit) setValues(EMPTY);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{values.id ? "Edit contact" : "Add contact"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First name *</Label>
              <Input
                value={values.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input
                value={values.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input
              value={values.company}
              onChange={(e) => set("company", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(v) => set("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned to</Label>
              <Select
                value={values.assignedToId || "unassigned"}
                onValueChange={(v) =>
                  set("assignedToId", v === "unassigned" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
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
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Saving…" : values.id ? "Save changes" : "Add contact"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
