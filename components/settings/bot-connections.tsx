"use client";

import { Check, Minus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConnectBotDialog } from "@/components/connect-bot-dialog";
import { Button } from "@/components/ui/button";

export function BotConnections({
  telegram,
  whatsappChatId,
}: {
  telegram: boolean;
  whatsappChatId: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"TELEGRAM" | "WHATSAPP" | null>(null);

  async function disconnect(platform: "TELEGRAM" | "WHATSAPP") {
    setPending(platform);
    const res = await fetch("/api/bot/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    setPending(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to disconnect");
      return;
    }
    toast.success(`${platform === "TELEGRAM" ? "Telegram" : "WhatsApp"} disconnected`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          {telegram ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Minus className="h-4 w-4 text-slate-300" />
          )}
          Telegram {telegram ? "— connected" : "— not connected"}
        </span>
        {telegram && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-red-600"
            disabled={pending === "TELEGRAM"}
            onClick={() => disconnect("TELEGRAM")}
          >
            {pending === "TELEGRAM" ? "Disconnecting…" : "Disconnect"}
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          {whatsappChatId ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Minus className="h-4 w-4 text-slate-300" />
          )}
          WhatsApp {whatsappChatId ? `— connected (${whatsappChatId})` : "— not connected"}
        </span>
        {whatsappChatId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-red-600"
            disabled={pending === "WHATSAPP"}
            onClick={() => disconnect("WHATSAPP")}
          >
            {pending === "WHATSAPP" ? "Disconnecting…" : "Disconnect"}
          </Button>
        )}
      </div>
      <ConnectBotDialog />
    </div>
  );
}
