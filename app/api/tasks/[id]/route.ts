import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { triggerN8n } from "@/lib/n8n";

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  completed: z.boolean().optional(),
  assignedToId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const task = await db.task.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId, deleted: false },
    include: { assignedTo: true, contact: true, deal: true },
  });
  if (!task) return fail("Task not found", 404);
  return ok(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.task.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId, deleted: false },
  });
  if (!existing) return fail("Task not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  // `completed` and `status` stay in sync: DONE <=> completed=true.
  // An explicit `completed` patch (checkbox, bot) wins over `status`.
  let nextStatus = parsed.data.status;
  let nextCompleted = parsed.data.completed;
  if (nextCompleted !== undefined) {
    nextStatus = nextCompleted ? "DONE" : existing.status === "DONE" ? "TODO" : undefined;
  } else if (nextStatus !== undefined) {
    nextCompleted = nextStatus === "DONE";
  }

  const justCompleted = nextCompleted === true && !existing.completed;
  const dueDate =
    parsed.data.dueDate === undefined
      ? undefined
      : parsed.data.dueDate
        ? new Date(parsed.data.dueDate)
        : null;

  const task = await db.task.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate,
      status: nextStatus,
      priority: parsed.data.priority,
      assignedToId:
        parsed.data.assignedToId === "" ? null : parsed.data.assignedToId,
      contactId: parsed.data.contactId === "" ? null : parsed.data.contactId,
      dealId: parsed.data.dealId === "" ? null : parsed.data.dealId,
      ...(nextCompleted !== undefined
        ? {
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date() : null,
          }
        : {}),
    },
  });

  if (justCompleted) {
    await db.activity.create({
      data: {
        workspaceId: session.workspaceId,
        contactId: existing.contactId,
        type: "TASK_COMPLETED",
        content: `Task completed: "${existing.title}"`,
        createdById: session.userId,
      },
    });
    void triggerN8n({
      event: "task-completed",
      taskId: task.id,
      workspaceId: session.workspaceId,
    });
  }

  return ok(task);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await db.task.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!existing) return fail("Task not found", 404);

  // Soft delete — hidden from lists, kept for history.
  await db.task.update({ where: { id: existing.id }, data: { deleted: true } });
  return ok({ deleted: true });
}
