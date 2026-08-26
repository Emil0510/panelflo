import { Bot, Building2, KeyRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountForm } from "@/components/settings/account-form";
import { BotConnections } from "@/components/settings/bot-connections";
import { PasswordForm } from "@/components/settings/password-form";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const isAdmin = session.user.role === "ADMIN";
  const telegram = botSessions.some((s) => s.platform === "TELEGRAM");
  const whatsapp = botSessions.find((s) => s.platform === "WHATSAPP");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardContent className="pt-6">
          <AccountForm
            userId={session.user.id}
            initialName={session.user.name ?? ""}
            email={session.user.email ?? ""}
            role={session.user.role}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Workspace
            </CardTitle>
            <CardDescription>
              <span className="flex items-center gap-2">
                <Badge className="bg-primary-light text-primary-dark" variant="outline">
                  {workspace.plan}
                </Badge>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                  <Link href="/billing">Manage billing</Link>
                </Button>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WorkspaceForm
              initialName={workspace.name}
              initialTimezone={workspace.timezone}
              slug={workspace.slug}
              editable={isAdmin}
            />
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                Only workspace admins can edit these settings.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-muted-foreground" />
              Bot connections
            </CardTitle>
            <CardDescription>Link Telegram or WhatsApp to log activity via chat.</CardDescription>
          </CardHeader>
          <CardContent>
            <BotConnections telegram={telegram} whatsappChatId={whatsapp?.chatId ?? null} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Security
          </CardTitle>
          <CardDescription>Change the password used to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
