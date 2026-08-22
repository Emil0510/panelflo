"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  return name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const PLAN_STYLES: Record<string, string> = {
  STARTER: "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400",
  GROWTH:  "border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400",
  PRO:     "border-primary/30 text-primary",
};

export function UserMenu({
  name,
  email,
  plan,
}: {
  name: string;
  email: string;
  plan: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full cursor-pointer items-center gap-3 border-t border-sidebar-border px-4 py-3 transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-medium text-foreground" title={name}>
              {name}
            </p>
            <Badge
              variant="outline"
              className={`mt-0.5 h-4 border px-1.5 text-[9.5px] font-semibold uppercase tracking-wide ${PLAN_STYLES[plan] ?? PLAN_STYLES.STARTER}`}
            >
              {plan}
            </Badge>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-52">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
