import { ok, requireN8nKey } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const denied = requireN8nKey(req);
  if (denied) return denied;

  const admins = await db.user.findMany({
    where: { role: "ADMIN", botSessions: { some: {} } },
    include: { botSessions: true },
  });

  return ok(
    admins.map((admin) => {
      const session = admin.botSessions[0];
      return {
        userId: admin.id,
        workspaceId: admin.workspaceId,
        platform: session.platform.toLowerCase(),
        chatId: session.chatId,
      };
    })
  );
}
