import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { db } from "@/lib/db";

const noteSchema = z.object({ content: z.string().min(1).max(5000) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const contact = await db.contact.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!contact) return fail("Contact not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const activity = await db.activity.create({
    data: {
      workspaceId: session.workspaceId,
      contactId: contact.id,
      type: "NOTE",
      content: parsed.data.content,
      createdById: session.userId,
    },
  });

  return ok(activity);
}
