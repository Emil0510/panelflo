import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold">Check your email</h1>
      <p className="text-sm text-muted-foreground">
        We sent you a verification link. Click it to activate your account,
        then sign in.
      </p>
      <Button asChild className="w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
