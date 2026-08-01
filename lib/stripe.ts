import Stripe from "stripe";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.includes("replace-me")) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    client = new Stripe(key);
  }
  return client;
}

export const PLANS = {
  starter: {
    name: "Starter",
    plan: "STARTER" as const,
    price: 29,
    priceIdEnv: "STRIPE_STARTER_PRICE_ID",
    features: ["1,000 contacts", "2 team members", "Telegram bot", "Daily digest"],
  },
  growth: {
    name: "Growth",
    plan: "GROWTH" as const,
    price: 59,
    priceIdEnv: "STRIPE_GROWTH_PRICE_ID",
    features: [
      "10,000 contacts",
      "10 team members",
      "Telegram + WhatsApp bots",
      "AI summaries & nudges",
    ],
  },
  pro: {
    name: "Pro",
    plan: "PRO" as const,
    price: 119,
    priceIdEnv: "STRIPE_PRO_PRICE_ID",
    features: [
      "Unlimited contacts",
      "Unlimited team members",
      "All bots + automations",
      "Priority support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function priceIdFor(planKey: PlanKey): string {
  return process.env[PLANS[planKey].priceIdEnv] ?? "";
}

export function planForPriceId(priceId: string): "STARTER" | "GROWTH" | "PRO" | null {
  for (const key of Object.keys(PLANS) as PlanKey[]) {
    if (priceIdFor(key) === priceId) return PLANS[key].plan;
  }
  return null;
}
