import { z } from "zod";

import { fail, isErrorResponse, ok, requireApiSession } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceIdFor, stripe } from "@/lib/stripe";

const schema = z.object({ plan: z.enum(["starter", "growth", "pro"]) });

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const priceId = priceIdFor(parsed.data.plan);
  if (!priceId || priceId.includes("replace-me")) {
    return fail("Stripe price not configured for this plan", 500);
  }

  const fullSession = await auth();
  const workspace = await db.workspace.findUnique({
    where: { id: session.workspaceId },
  });
  if (!workspace) return fail("Workspace not found", 404);

  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: workspace.stripeCustomerId ?? undefined,
    customer_email: workspace.stripeCustomerId
      ? undefined
      : (fullSession?.user?.email ?? undefined),
    success_url: `${process.env.NEXTAUTH_URL}/?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/billing`,
    metadata: { workspaceId: session.workspaceId, userId: session.userId },
    subscription_data: {
      metadata: { workspaceId: session.workspaceId },
    },
  });

  return ok({ url: checkout.url });
}
