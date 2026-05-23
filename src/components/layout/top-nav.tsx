"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/schedule", label: "Schedule" },
  { href: "/gym", label: "Gym" },
  { href: "/health", label: "Health" },
  { href: "/finance", label: "Finance" },
];

export function TopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex justify-center px-4 pt-4">
      <nav className="glass flex h-14 w-full max-w-7xl items-center justify-between rounded-full px-3 sm:px-5">
        <Link href="/" className="flex items-center gap-2 pl-2">
          <div className="relative h-6 w-6">
            <div className="absolute inset-0 rounded-md bg-emerald-500/20 blur-md" />
            <div className="relative flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 text-[10px] font-bold text-black">
              ◈
            </div>
          </div>
          <span className="text-sm font-medium tracking-tight">Dashboard</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-sm transition-colors",
                  active
                    ? "text-white"
                    : "text-muted-foreground hover:text-white",
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-white/5 ring-1 ring-emerald-500/20" />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-700/30 text-xs font-medium text-emerald-100">
              {(session?.user?.name ?? session?.user?.email ?? "?")[0]?.toUpperCase()}
            </div>
            <span className="hidden max-w-[100px] truncate sm:block">
              {session?.user?.name ?? session?.user?.email}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div
              className="glass-strong absolute right-0 top-12 z-50 min-w-[200px] rounded-2xl p-1 text-sm"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {session?.user?.email}
              </div>
              <div className="my-1 h-px bg-white/5" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-muted-foreground hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
