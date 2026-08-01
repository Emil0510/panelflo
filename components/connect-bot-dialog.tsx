"use client";

import { Bot, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ConnectBotDialog() {
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waStep, setWaStep] = useState<"phone" | "code" | "done">("phone");
  const [waCode, setWaCode] = useState("");
  const [waError, setWaError] = useState<string | null>(null);

  async function generateTelegramCode() {
    setLoadingCode(true);
    const res = await fetch("/api/bot/connect-code", { method: "POST" });
    const json = await res.json();
    setTelegramCode(json.data?.code ?? null);
    setLoadingCode(false);
  }

  async function sendWhatsappCode() {
    setWaError(null);
    const res = await fetch("/api/bot/whatsapp-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: waPhone }),
    });
    if (!res.ok) {
      const json = await res.json();
      setWaError(json.error ?? "Failed to send code");
      return;
    }
    setWaStep("code");
  }

  async function confirmWhatsappCode() {
    setWaError(null);
    const res = await fetch("/api/bot/whatsapp-verify", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: waPhone, code: waCode }),
    });
    if (!res.ok) {
      const json = await res.json();
      setWaError(json.error ?? "Invalid code");
      return;
    }
    setWaStep("done");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Bot className="h-4 w-4" />
          Connect Bot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect your bot</DialogTitle>
          <DialogDescription>
            Manage tasks and contacts from Telegram or WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="telegram">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="telegram">Telegram</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>
          <TabsContent value="telegram" className="space-y-4 pt-2">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                Open{" "}
                <a
                  href="https://t.me/panelflo_bot"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  @panelflo_bot
                </a>{" "}
                in Telegram
              </li>
              <li>Generate a one-time code below</li>
              <li>
                Send <code className="rounded bg-muted px-1">/connect [code]</code>{" "}
                to the bot
              </li>
            </ol>
            {telegramCode ? (
              <div className="rounded-lg bg-primary-light p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Your code (valid 5 minutes)
                </p>
                <p className="text-2xl font-bold tracking-[0.3em] text-primary-dark">
                  {telegramCode}
                </p>
              </div>
            ) : (
              <Button
                onClick={generateTelegramCode}
                disabled={loadingCode}
                className="w-full"
              >
                {loadingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate code
              </Button>
            )}
          </TabsContent>
          <TabsContent value="whatsapp" className="space-y-4 pt-2">
            {waStep === "phone" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Enter your WhatsApp number with country code. We&apos;ll send a
                  verification code.
                </p>
                <Input
                  placeholder="+994501234567"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                />
                <Button onClick={sendWhatsappCode} className="w-full">
                  Send verification code
                </Button>
              </>
            )}
            {waStep === "code" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code we sent to {waPhone}.
                </p>
                <Input
                  placeholder="123456"
                  value={waCode}
                  onChange={(e) => setWaCode(e.target.value)}
                  maxLength={6}
                />
                <Button onClick={confirmWhatsappCode} className="w-full">
                  Confirm
                </Button>
              </>
            )}
            {waStep === "done" && (
              <div className="rounded-lg bg-primary-light p-4 text-center text-sm font-medium text-primary-dark">
                WhatsApp connected! Say hi to Flo.
              </div>
            )}
            {waError && <p className="text-sm text-red-600">{waError}</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
