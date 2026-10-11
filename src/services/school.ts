import { api } from "@/lib/api";
import type { DashboardSummary, School, SchoolUser } from "@/types";
import type { SchoolUserValues, SchoolValues } from "@/validation/schemas";

export const schoolService = {
  get: () => api.get<School>("/school").then((r) => r.data),
  update: (v: SchoolValues) => api.patch<School>("/school", v).then((r) => r.data),
  summary: () => api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
};

export const staffService = {
  list: () => api.get<SchoolUser[]>("/staff").then((r) => r.data),
  invite: (v: SchoolUserValues) => api.post<SchoolUser>("/staff", v).then((r) => r.data),
  setStatus: (id: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") =>
    api.patch(`/staff/${id}/status`, { status }).then((r) => r.data),
  setRole: (id: string, role: "ADMIN" | "STAFF") => api.patch(`/staff/${id}/role`, { role }).then((r) => r.data),
};
