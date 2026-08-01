import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const taskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable().or(z.string().optional().nullable()),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const assignee = searchParams.get("assignee");
  const due = searchParams.get("due"); // today | overdue
  const status = searchParams.get("status"); // open | completed

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const tasks = await db.task.findMany({
    where: {
      workspaceId: session.workspaceId,
      deleted: false,
      ...(assignee ? { assignedToId: assignee } : {}),
      ...(status === "open" ? { completed: false } : {}),
      ...(status === "completed" ? { completed: true } : {}),
      ...(due === "today"
        ? { dueDate: { gte: startOfDay, lt: endOfDay } }
        : {}),
      ...(due === "overdue"
        ? { dueDate: { lt: startOfDay }, completed: false }
        : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
    take: 500,
  });

  return ok(tasks, { count: tasks.length });
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (dueDate && isNaN(dueDate.getTime())) return fail("Invalid due date", 400);

  const status = parsed.data.status ?? "TODO";
  const task = await db.task.create({
    data: {
      workspaceId: session.workspaceId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueDate,
      status,
      priority: parsed.data.priority ?? "MEDIUM",
      completed: status === "DONE",
      completedAt: status === "DONE" ? new Date() : null,
      assignedToId: parsed.data.assignedToId || session.userId,
      contactId: parsed.data.contactId || null,
      dealId: parsed.data.dealId || null,
      createdById: session.userId,
      source: "WEB",
    },
  });

  return ok(task);
}
