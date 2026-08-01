import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceTaskColumns } from "@/lib/columns";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cols = await getWorkspaceTaskColumns(session.user.workspaceId);
  return NextResponse.json(cols);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, color } = await req.json();
  if (!label?.trim()) return NextResponse.json({ error: "Label required" }, { status: 400 });

  const existing = await db.taskColumn.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: { order: "asc" },
  });

  const key = `CUSTOM_${Date.now()}`;
  const col = await db.taskColumn.create({
    data: {
      workspaceId: session.user.workspaceId,
      key,
      label: label.trim(),
      color: color ?? "#64748B",
      order: existing.length,
      isSystem: false,
    },
  });

  return NextResponse.json(col, { status: 201 });
}
