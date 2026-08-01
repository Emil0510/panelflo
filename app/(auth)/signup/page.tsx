"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const invitedEmail = searchParams.get("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email,
        password,
        inviteToken: inviteToken ?? undefined,
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(json.error ?? "Something went wrong");
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {inviteToken ? "Join your team" : "Create your workspace"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {inviteToken
            ? "Finish creating your account to join the workspace"
            : "Start your free 14-day trial — no card required"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[13px] font-medium text-foreground">
            Full name
          </Label>
          <Input
            id="name"
            name="name"
            required
            autoComplete="name"
            placeholder="Your full name"
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
            Work email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            defaultValue={invitedEmail ?? ""}
            readOnly={Boolean(invitedEmail)}
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
            autoComplete="new-password"
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/10">
            <span className="mt-0.5 text-base leading-none">⚠</span>
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="mt-1 h-10 w-full font-semibold"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
