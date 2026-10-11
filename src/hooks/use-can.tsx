"use client";

import { useAuthStore } from "@/stores/auth-store";
import type { PermissionKey } from "@/lib/permissions";

/** `can(a, b)` is true when the user holds ANY of the listed permissions. */
export function useCan() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  return (...perms: PermissionKey[]) => perms.some((p) => permissions.includes(p));
}

export function Can({
  any,
  fallback = null,
  children,
}: {
  any: PermissionKey[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const can = useCan();
  return <>{can(...any) ? children : fallback}</>;
}
