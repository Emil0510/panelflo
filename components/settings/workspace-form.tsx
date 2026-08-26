"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

const TIMEZONES = [
  "UTC",
  "Asia/Baku",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Istanbul",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function WorkspaceForm({
  initialName,
  initialTimezone,
  slug,
  editable,
}: {
  initialName: string;
  initialTimezone: string;
  slug: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, setSaving] = useState(false);

  const dirty = name !== initialName || timezone !== initialTimezone;
  const timezoneOptions = TIMEZONES.includes(initialTimezone)
    ? TIMEZONES
    : [initialTimezone, ...TIMEZONES];

  async function save() {
    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), timezone }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to update workspace");
      return;
    }
    toast.success("Workspace updated");
    router.refresh();
  }

  if (!editable) {
    return (
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Name: </span>
          {initialName}
        </p>
        <p>
          <span className="text-muted-foreground">Slug: </span>
          {slug}
        </p>
        <p>
          <span className="text-muted-foreground">Timezone: </span>
          {initialTimezone}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Workspace name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Slug</Label>
        <Input value={slug} disabled className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Slug can&apos;t be changed after creation.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezoneOptions.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" onClick={save} disabled={!dirty || saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
