import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      workspaceId: string;
      role: "ADMIN" | "MEMBER";
    };
    workspace: {
      plan: "STARTER" | "GROWTH" | "PRO";
      trialEndsAt: string | null;
      subscriptionActive: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    workspaceId?: string;
    role?: "ADMIN" | "MEMBER";
    plan?: "STARTER" | "GROWTH" | "PRO";
    trialEndsAt?: string | null;
    subscriptionActive?: boolean;
  }
}
