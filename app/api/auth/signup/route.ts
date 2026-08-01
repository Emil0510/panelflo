import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { verifyInviteToken } from "@/lib/invite";

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  inviteToken: z.string().optional(),
});

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "workspace"
  );
}

const TRIAL_DAYS = 14;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, password, inviteToken } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { data: null, error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);

  // Invited user joins the existing workspace.
  if (inviteToken) {
    const invite = verifyInviteToken(inviteToken);
    if (!invite || invite.email.toLowerCase() !== email) {
      return NextResponse.json(
        { data: null, error: "Invite link is invalid or expired" },
        { status: 400 }
      );
    }
    const workspace = await db.workspace.findUnique({
      where: { id: invite.workspaceId },
    });
    if (!workspace) {
      return NextResponse.json(
        { data: null, error: "Workspace no longer exists" },
        { status: 400 }
      );
    }
    const user = await db.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: invite.role,
        workspaceId: workspace.id,
      },
    });
    return NextResponse.json({ data: { userId: user.id }, error: null });
  }

  // Fresh signup: create workspace, user is ADMIN, 14-day trial.
  const baseSlug = slugify(name);
  let slug = baseSlug;
  for (let i = 1; await db.workspace.findUnique({ where: { slug } }); i++) {
    slug = `${baseSlug}-${i}`;
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const workspace = await db.workspace.create({
    data: {
      name: `${name}'s Workspace`,
      slug,
      trialEndsAt,
      users: {
        create: { name, email, password: passwordHash, role: "ADMIN" },
      },
    },
    include: { users: true },
  });

  return NextResponse.json({
    data: { userId: workspace.users[0].id, workspaceId: workspace.id },
    error: null,
  });
}
