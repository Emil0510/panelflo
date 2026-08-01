"use client";

import {
  Bell,
  CheckSquare,
  Contact,
  CreditCard,
  Kanban,
  LayoutDashboard,
  Package,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/contacts",  label: "Contacts",  icon: Contact },
      { href: "/pipeline",  label: "Pipeline",  icon: Kanban },
      { href: "/tasks",     label: "Tasks",     icon: CheckSquare },
      { href: "/stock",     label: "Stock",     icon: Package },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/team",          label: "Team",          icon: Users },
      { href: "/billing",       label: "Billing",       icon: CreditCard },
      { href: "/settings",      label: "Settings",      icon: Settings },
    ],
  },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 px-3 py-2">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {section.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <div key={href} className="relative">
                  {active && (
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-[1px]">
                      <span className="h-5 w-[3px] rounded-full bg-primary" />
                    </span>
                  )}
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-primary/[0.08] text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                        active ? "text-primary" : "text-muted-foreground/70"
                      )}
                    />
                    {label}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
