import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.user.findFirst({
    where: { id: params.id, workspaceId: session.user.workspaceId },
    include: {
      botSessions: true,
      _count: {
        select: {
          assignedTasks: { where: { deleted: false, completed: false } },
          assignedDeals: { where: { stage: { notIn: ["WON", "LOST"] } } },
        },
      },
    },
  });

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activities = await db.activity.findMany({
    where: { workspaceId: session.user.workspaceId, createdById: params.id },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return NextResponse.json({ member, activities });
}
