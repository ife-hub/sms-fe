import { api } from "@/lib/api";
import type { AuthUser, LoginResponse } from "@/types";
import type { ChangePasswordValues, LoginValues } from "@/validation/schemas";

export const authService = {
  login: (v: LoginValues) => api.post<LoginResponse>("/auth/login", v).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  changePassword: (v: Pick<ChangePasswordValues, "currentPassword" | "newPassword">) =>
    api.post<{ user: AuthUser }>("/auth/change-password", v).then((r) => r.data),
};
