"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";

export function TaskCompleteCheckbox({
  taskId,
  completed,
}: {
  taskId: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle(checked: boolean) {
    setPending(true);
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: checked }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <Checkbox
      checked={completed}
      disabled={pending}
      onCheckedChange={(v) => toggle(v === true)}
      className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
    />
  );
}
