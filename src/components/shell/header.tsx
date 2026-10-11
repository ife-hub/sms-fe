"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "./sidebar";
import { useAuthStore } from "@/stores/auth-store";
import { authService } from "@/services/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { initials } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      /* the local session is cleared either way */
    }
    clear();
    qc.clear();
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent title="Menu" className="left-0 top-0 h-full max-h-none w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-0 p-0">
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold leading-tight">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted">{user.username}</p>
        </div>
        <Badge tone="info">{ROLE_LABELS[user.role]}</Badge>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-board text-xs font-semibold text-white" aria-hidden>
          {initials(user.firstName, user.lastName)}
        </span>
        <Button variant="secondary" size="sm" onClick={logout} loading={loggingOut}>
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </header>
  );
}
