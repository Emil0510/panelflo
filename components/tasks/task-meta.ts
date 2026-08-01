export type TaskStatus = string;
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  completed: boolean;
  source: "WEB" | "BOT";
  assignedTo: { id: string; name: string | null } | null;
  contact: { id: string; name: string } | null;
  deal: { id: string; title: string } | null;
};

export const DEFAULT_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "TODO",        label: "To Do",       color: "var(--status-todo-fg)" },
  { key: "IN_PROGRESS", label: "In Progress", color: "var(--status-progress-fg)" },
  { key: "IN_REVIEW",   label: "In Review",   color: "var(--status-review-fg)" },
  { key: "DONE",        label: "Done",        color: "var(--status-done-fg)" },
];

export const STATUS_STYLES: Record<string, string> = {
  TODO:        "[background-color:var(--status-todo)] [color:var(--status-todo-fg)]",
  IN_PROGRESS: "[background-color:var(--status-progress)] [color:var(--status-progress-fg)]",
  IN_REVIEW:   "[background-color:var(--status-review)] [color:var(--status-review-fg)]",
  DONE:        "[background-color:var(--status-done)] [color:var(--status-done-fg)]",
};

export const PRIORITIES: { key: TaskPriority; label: string }[] = [
  { key: "LOW", label: "Low" },
  { key: "MEDIUM", label: "Medium" },
  { key: "HIGH", label: "High" },
  { key: "URGENT", label: "Urgent" },
];

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW:    "[background-color:var(--priority-low)] [color:var(--priority-low-fg)]",
  MEDIUM: "[background-color:var(--priority-medium)] [color:var(--priority-medium-fg)]",
  HIGH:   "[background-color:var(--priority-high)] [color:var(--priority-high-fg)]",
  URGENT: "[background-color:var(--priority-urgent)] [color:var(--priority-urgent-fg)]",
};

export async function patchTask(id: string, body: Record<string, unknown>) {
  return fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
