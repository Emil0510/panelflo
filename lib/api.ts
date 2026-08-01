import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export type ApiSession = {
  userId: string;
  workspaceId: string;
  role: "ADMIN" | "MEMBER";
};

/** Standard JSON envelope: { data, error, meta }. */
export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, error: null, meta: meta ?? null });
}

export function fail(error: string, status: number) {
  return NextResponse.json({ data: null, error, meta: null }, { status });
}

export async function requireApiSession(): Promise<ApiSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.workspaceId) {
    return fail("Not authenticated", 401);
  }
  return {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };
}

export function isErrorResponse(
  value: ApiSession | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}

/** n8n endpoints authenticate with a shared API key instead of a session. */
export function requireN8nKey(req: Request): NextResponse | null {
  const key = req.headers.get("x-api-key");
  if (!key || key !== process.env.N8N_API_KEY) {
    return fail("Invalid API key", 401);
  }
  return null;
}
