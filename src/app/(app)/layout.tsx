"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { isRouteAllowed } from "@/lib/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { Forbidden, Spinner } from "@/components/ui/feedback";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && user?.mustChangePassword) router.replace("/change-password");
  }, [status, user, router]);

  if (status !== "authenticated" || !user || user.mustChangePassword) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  const allowed = isRouteAllowed(pathname, user.permissions);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[18rem_1fr]">
      <aside className="no-print sticky top-0 hidden h-screen lg:block">
        <Sidebar />
      </aside>
      <div className="min-w-0">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{allowed ? children : <Forbidden />}</main>
      </div>
    </div>
  );
}
