import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(150).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  assignedToId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignedToId = searchParams.get("assignedToId");
  const search = searchParams.get("search");

  const contacts = await db.contact.findMany({
    where: {
      workspaceId: session.workspaceId,
      ...(status ? { status: status as "LEAD" | "ACTIVE" | "INACTIVE" } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { company: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return ok(contacts, { count: contacts.length });
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const contact = await db.contact.create({
    data: {
      workspaceId: session.workspaceId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      notes: parsed.data.notes || null,
      status: parsed.data.status ?? "LEAD",
      assignedToId: parsed.data.assignedToId || null,
    },
  });

  return ok(contact);
}
