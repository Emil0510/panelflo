import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await db.pipelineColumn.findUnique({ where: { id: params.id } });
  if (!col || col.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { label, color } = await req.json();
  const updated = await db.pipelineColumn.update({
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

  const col = await db.pipelineColumn.findUnique({ where: { id: params.id } });
  if (!col || col.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const total = await db.pipelineColumn.count({ where: { workspaceId: session.user.workspaceId } });
  if (total <= 1) {
    return NextResponse.json({ error: "Cannot delete last column" }, { status: 400 });
  }

  const dealsInCol = await db.deal.count({
    where: { workspaceId: session.user.workspaceId, stage: col.key },
  });
  if (dealsInCol > 0) {
    return NextResponse.json(
      { error: `Column has ${dealsInCol} deal(s). Move them first.` },
      { status: 400 }
    );
  }

  await db.pipelineColumn.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
