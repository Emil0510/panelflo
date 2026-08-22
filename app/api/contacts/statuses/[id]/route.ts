import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await db.contactColumn.findUnique({ where: { id: params.id } });
  if (!col || col.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { label, color } = await req.json();
  const updated = await db.contactColumn.update({
    where: { id: params.id },
    data: {
      ...(label?.trim() ? { label: label.trim() } : {}),
      ...(color ? { color } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await db.contactColumn.findUnique({ where: { id: params.id } });
  if (!col || col.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const total = await db.contactColumn.count({ where: { workspaceId: session.user.workspaceId } });
  if (total <= 1) {
    return NextResponse.json({ error: "Cannot delete last status" }, { status: 400 });
  }

  const contactsInStatus = await db.contact.count({
    where: { workspaceId: session.user.workspaceId, status: col.key },
  });
  if (contactsInStatus > 0) {
    return NextResponse.json(
      { error: `Status has ${contactsInStatus} contact(s). Move them first.` },
      { status: 400 }
    );
  }

  await db.contactColumn.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
