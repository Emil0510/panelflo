import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user?.password) return null;

        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      const userId = user?.id ?? token.sub;
      if (!userId) return token;

      // Refresh workspace claims on sign-in and on session updates so
      // plan/trial changes propagate without forcing re-login.
      if (user || trigger === "update" || !token.workspaceId) {
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          include: { workspace: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.workspaceId = dbUser.workspaceId;
          token.role = dbUser.role;
          token.plan = dbUser.workspace.plan;
          token.trialEndsAt = dbUser.workspace.trialEndsAt?.toISOString() ?? null;
          token.subscriptionActive = dbUser.workspace.subscriptionActive;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.workspaceId = token.workspaceId as string;
        session.user.role = token.role as "ADMIN" | "MEMBER";
        session.workspace = {
          plan: token.plan as "STARTER" | "GROWTH" | "PRO",
          trialEndsAt: (token.trialEndsAt as string | null) ?? null,
          subscriptionActive: Boolean(token.subscriptionActive),
        };
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.workspaceId) return null;
  return session;
}
