"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { visibleNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const items = visibleNav(user?.permissions ?? []);

  // The most specific matching item is the active one (so /students/import does not also light up /students).
  const active = [...items]
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav aria-label="Main" className="flex h-full flex-col bg-board text-chalk">
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="grid h-9 w-9 place-items-center rounded-field bg-chalk text-board">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold leading-tight text-white">{user?.schoolName}</p>
          <p className="text-xs text-chalk/70">School dashboard</p>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {items.map((item) => {
          const isActive = active?.href === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-board-soft text-white" : "text-chalk/80 hover:bg-board-soft/60 hover:text-white",
                )}
              >
                {isActive && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-bus" aria-hidden />}
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
