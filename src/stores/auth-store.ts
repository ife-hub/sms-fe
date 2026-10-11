import { create } from "zustand";
import type { AuthUser } from "@/types";

type AuthStatus = "booting" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** Kept in memory only. The refresh token lives in an httpOnly cookie managed by the API. */
  accessToken: string | null;
  setSession: (accessToken: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

const SESSION_HINT = "sms_session";

/** A non-sensitive hint cookie so proxy.ts can redirect before the client boots. It is NOT an authorization control. */
function setSessionHint(on: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = on
    ? `${SESSION_HINT}=1; path=/; SameSite=Lax`
    : `${SESSION_HINT}=; path=/; max-age=0; SameSite=Lax`;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "booting",
  user: null,
  accessToken: null,
  setSession: (accessToken, user) => {
    setSessionHint(true);
    set({ accessToken, user, status: "authenticated" });
  },
  setUser: (user) => set({ user }),
  clear: () => {
    setSessionHint(false);
    set({ accessToken: null, user: null, status: "unauthenticated" });
  },
}));
