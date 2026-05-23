"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Dumbbell, HeartPulse, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", Icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", Icon: Calendar },
  { href: "/gym", label: "Gym", Icon: Dumbbell },
  { href: "/health", label: "Health", Icon: HeartPulse },
  { href: "/finance", label: "Finance", Icon: Wallet },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 md:hidden">
      <div className="glass flex items-center gap-1 rounded-full p-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                active ? "text-white" : "text-muted-foreground",
              )}
              aria-label={label}
            >
              {active && (
                <span className="absolute inset-0 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30" />
              )}
              <Icon className="relative h-4.5 w-4.5" strokeWidth={1.75} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
