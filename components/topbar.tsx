"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ConnectBotDialog } from "@/components/connect-bot-dialog";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const TITLES: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/contacts":      "Contacts",
  "/pipeline":      "Pipeline",
  "/tasks":         "Tasks",
  "/stock":         "Stock",
  "/team":          "Team",
  "/settings":      "Settings",
  "/billing":       "Billing",
  "/notifications": "Notifications",
};

export function Topbar({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title =
    TITLES[pathname] ??
    TITLES[`/${pathname.split("/")[1]}`] ??
    "Dashboard";

  return (
    <header className="flex h-[56px] shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-5">
      {/* Mobile hamburger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="flex items-center gap-2.5 px-5 py-[18px] border-b border-border">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
              style={{ background: "linear-gradient(135deg, #2B5748 0%, #618764 100%)" }}
            >
              <span className="text-[11px] font-extrabold">P</span>
            </div>
            <span className="text-[15px] font-bold tracking-tight">Panelflo</span>
          </SheetTitle>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>

      {/* Search */}
      <div className="relative ml-auto hidden w-56 sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search…"
          className="h-8 rounded-lg border-border bg-muted/60 pl-8 text-sm placeholder:text-muted-foreground/60 focus-visible:bg-background"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden select-none items-center gap-0.5 rounded border border-border bg-background px-1 text-[10px] font-medium text-muted-foreground sm:flex">
          ⌘K
        </kbd>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell unread={unreadNotifications} />
        <ConnectBotDialog />
      </div>
    </header>
  );
}
