"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AddNoteForm({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!note.trim()) return;
    setSaving(true);
    await fetch(`/api/contacts/${contactId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note }),
    });
    setSaving(false);
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Add a note…"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button size="sm" onClick={submit} disabled={saving || !note.trim()}>
        {saving ? "Adding…" : "Add Note"}
      </Button>
    </div>
  );
}
