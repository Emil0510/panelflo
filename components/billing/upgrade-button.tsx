"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function UpgradeButton({
  plan,
  current,
}: {
  plan: "starter" | "growth" | "pro";
  current: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok || !json.data?.url) {
      setError(json.error ?? "Checkout failed");
      return;
    }
    window.location.href = json.data.url;
  }

  return (
    <div className="space-y-1">
      <Button
        onClick={upgrade}
        disabled={loading || current}
        className="w-full"
        variant={current ? "outline" : "default"}
      >
        {current ? "Current plan" : loading ? "Redirecting…" : "Upgrade"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
