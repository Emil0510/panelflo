import Link from "next/link";

import { Button } from "@/components/ui/button";
import { verifyInviteToken } from "@/lib/invite";

export const dynamic = "force-dynamic";

export default function InvitePage({ params }: { params: { token: string } }) {
  const invite = verifyInviteToken(decodeURIComponent(params.token));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-light/40 px-4">
      <div className="mb-8 flex items-center gap-2 text-2xl font-bold text-primary-dark">
        Panelflo
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </div>
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm">
        {!invite ? (
          <>
            <h1 className="text-xl font-semibold">Invite expired</h1>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or has expired. Ask your teammate to
              send a new one.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">
              Join {invite.workspaceName}
            </h1>
            <p className="text-sm text-muted-foreground">
              <strong>{invite.invitedByName}</strong> invited you to join their
              Panelflo workspace as{" "}
              {invite.role === "ADMIN" ? "an admin" : "a member"}.
            </p>
            <Button asChild className="w-full">
              <Link
                href={`/signup?invite=${encodeURIComponent(params.token)}&email=${encodeURIComponent(invite.email)}`}
              >
                Accept invite
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
