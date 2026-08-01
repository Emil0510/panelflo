import { createHmac, timingSafeEqual } from "crypto";

export type InvitePayload = {
  email: string;
  workspaceId: string;
  role: "ADMIN" | "MEMBER";
  invitedByName: string;
  workspaceName: string;
  exp: number; // unix ms
};

const INVITE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function secret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

function sign(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createInviteToken(
  payload: Omit<InvitePayload, "exp">
): string {
  const full: InvitePayload = { ...payload, exp: Date.now() + INVITE_TTL_MS };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyInviteToken(token: string): InvitePayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as InvitePayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
