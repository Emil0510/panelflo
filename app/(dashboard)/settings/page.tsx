import { Bot, Building2, KeyRound, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountForm } from "@/components/settings/account-form";
import { BotConnections } from "@/components/settings/bot-connections";
import { PasswordForm } from "@/components/settings/password-form";
import { WorkspaceForm } from "@/components/settings/workspace-form";
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

  const isAdmin = session.user.role === "ADMIN";
  const telegram = botSessions.some((s) => s.platform === "TELEGRAM");
  const whatsapp = botSessions.find((s) => s.platform === "WHATSAPP");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Plan:</span>
            <Badge className="bg-primary-light text-primary-dark" variant="outline">
              {workspace.plan}
            </Badge>
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <Link href="/billing">Manage billing</Link>
            </Button>
          </div>
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
        </CardHeader>
        <CardContent>
          <BotConnections telegram={telegram} whatsappChatId={whatsapp?.chatId ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Email:</span>
            {session.user.email}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Role:</span>
            <Badge variant="outline">{session.user.role}</Badge>
          </div>
          <AccountForm initialName={session.user.name ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
