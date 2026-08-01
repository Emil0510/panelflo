import { ok, requireN8nKey } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const denied = requireN8nKey(req);
  if (denied) return denied;

  const sessions = await db.botSession.findMany({
    include: { user: { select: { workspaceId: true } } },
  });

  return ok(
    sessions.map((s) => ({
      userId: s.userId,
      platform: s.platform.toLowerCase(),
      chatId: s.chatId,
      workspaceId: s.user.workspaceId,
    }))
  );
}
