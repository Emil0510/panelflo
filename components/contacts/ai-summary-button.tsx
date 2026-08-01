"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function AiSummaryButton({ contactId }: { contactId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function summarize() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/ai/summarize-contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "AI summary failed");
      return;
    }
    setSummary(json.data.summary);
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={summarize}
        disabled={loading}
        className="gap-2 border-primary/40 text-primary hover:bg-primary-light"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        AI Summary
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {summary && (
        <div className="whitespace-pre-line rounded-lg border border-primary/30 bg-primary-light p-3 text-sm text-primary-dark">
          {summary}
        </div>
      )}
    </div>
  );
}
