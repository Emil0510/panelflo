import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(150).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  assignedToId: z.string().optional().nullable(),
});

async function findScoped(id: string, workspaceId: string) {
  return db.contact.findFirst({ where: { id, workspaceId } });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const contact = await db.contact.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
    include: {
      assignedTo: { select: { id: true, name: true } },
      deals: true,
      tasks: { where: { deleted: false } },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!contact) return fail("Contact not found", 404);
  return ok(contact);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await findScoped(params.id, session.workspaceId);
  if (!existing) return fail("Contact not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const data = { ...parsed.data };
  if (data.email === "") data.email = null;
  if (data.assignedToId === "") data.assignedToId = null;

  const contact = await db.contact.update({
    where: { id: existing.id },
    data,
  });
  return ok(contact);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const existing = await findScoped(params.id, session.workspaceId);
  if (!existing) return fail("Contact not found", 404);

  await db.contact.delete({ where: { id: existing.id } });
  return ok({ deleted: true });
}
