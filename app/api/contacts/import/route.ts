import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const importSchema = z.object({
  contacts: z
    .array(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().max(100).optional(),
        email: z.string().max(200).optional(),
        phone: z.string().max(30).optional(),
        company: z.string().max(150).optional(),
      })
    )
    .min(1)
    .max(500),
});

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const result = await db.contact.createMany({
    data: parsed.data.contacts.map((c) => ({
      workspaceId: session.workspaceId,
      firstName: c.firstName,
      lastName: c.lastName || null,
      email: c.email || null,
      phone: c.phone || null,
      company: c.company || null,
    })),
  });

  return ok({ imported: result.count });
}
