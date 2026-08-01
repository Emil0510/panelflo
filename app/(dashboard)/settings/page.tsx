import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ConnectBotDialog } from "@/components/connect-bot-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [workspace, botSessions] = await Promise.all([
    db.workspace.findUnique({ where: { id: session.user.workspaceId } }),
    db.botSession.findMany({ where: { userId: session.user.id } }),
  ]);
  if (!workspace) redirect("/login");

  const telegram = botSessions.find((s) => s.platform === "TELEGRAM");
  const whatsapp = botSessions.find((s) => s.platform === "WHATSAPP");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {workspace.name}
          </p>
          <p>
            <span className="text-muted-foreground">Slug: </span>
            {workspace.slug}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Plan: </span>
            <Badge className="bg-primary-light text-primary-dark" variant="outline">
              {workspace.plan}
            </Badge>
          </p>
          <p>
            <span className="text-muted-foreground">Timezone: </span>
            {workspace.timezone}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/billing">Manage billing</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bot connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {telegram ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Minus className="h-4 w-4 text-slate-300" />
              )}
              Telegram {telegram ? "— connected" : "— not connected"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {whatsapp ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Minus className="h-4 w-4 text-slate-300" />
              )}
              WhatsApp {whatsapp ? `— connected (${whatsapp.chatId})` : "— not connected"}
            </span>
          </div>
          <ConnectBotDialog />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {session.user.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {session.user.email}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Role: </span>
            <Badge variant="outline">{session.user.role}</Badge>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
