import { z } from "zod";

import { fail, ok, requireN8nKey } from "@/lib/api";
import { ACTIONS, executeBotAction, HELP_TEXT } from "@/lib/bot-actions";
import { db } from "@/lib/db";

const schema = z.object({
  userId: z.string().optional(),
  action: z.enum(ACTIONS).catch("UNKNOWN"),
  data: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Tool endpoint for the n8n AI Agent. Executes one business action and
 * RETURNS the result as text — the agent composes the final reply and the
 * workflow sends it, so unlike /api/webhooks/bot-action nothing is
 * messaged from here.
 */
export async function POST(req: Request) {
  // n8n's HTTP Request Tool can't carry expression headers (its {braces}
  // placeholder parser collides with n8n expressions), so the shared key
  // may arrive as a ?key= query param instead of the x-api-key header.
  const url = new URL(req.url);
  const queryKey = url.searchParams.get("key");
  if (queryKey !== process.env.N8N_API_KEY) {
    const denied = requireN8nKey(req);
    if (denied) return denied;
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const userId = parsed.data.userId ?? url.searchParams.get("userId");
  if (!userId) return fail("userId is required (body or query)", 400);

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return fail("User not found", 404);

  if (parsed.data.action === "HELP") return ok({ result: HELP_TEXT });

  try {
    const result = await executeBotAction(parsed.data.action, parsed.data.data, {
      id: user.id,
      workspaceId: user.workspaceId,
      role: user.role,
    });
    return ok({ result: result ?? "Done." });
  } catch (err) {
    console.error("[agent-tool] action failed:", err);
    return ok({ result: "The action failed unexpectedly. Tell the user to try again." });
  }
}
