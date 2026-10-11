import { api } from "@/lib/api";
import type {
  AuditEvent,
  Enrollment,
  ImportPreview,
  ImportResult,
  Paginated,
  QrCredential,
  QrScanResult,
  Student,
  StudentListItem,
} from "@/types";
import type { EnrollmentUpdateValues, GuardianValues, StudentValues } from "@/validation/schemas";

export interface StudentListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AccountCredentials {
  username: string;
  temporaryPassword: string;
}

export const studentsService = {
  list: (params: StudentListParams) => api.get<Paginated<StudentListItem>>("/students", { params }).then((r) => r.data),
  get: (id: string) => api.get<Student>(`/students/${id}`).then((r) => r.data),
  create: (v: StudentValues) => api.post<Student>("/students", v).then((r) => r.data),
  update: (id: string, v: Partial<Student>) => api.patch<Student>(`/students/${id}`, v).then((r) => r.data),
  setGuardians: (id: string, guardians: GuardianValues[]) =>
    api.put<Student>(`/students/${id}/guardians`, { guardians }).then((r) => r.data),
  changeEnrollment: (id: string, v: EnrollmentUpdateValues) =>
    api.post<Student>(`/students/${id}/enrollments`, v).then((r) => r.data),

  activateAccount: (id: string) => api.post<AccountCredentials>(`/students/${id}/account`).then((r) => r.data),
  resetPassword: (id: string) => api.post<AccountCredentials>(`/students/${id}/account/reset`).then((r) => r.data),
  setAccountStatus: (id: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") =>
    api.patch(`/students/${id}/account/status`, { status }).then((r) => r.data),

  issueQr: (id: string) => api.post<QrCredential>(`/students/${id}/qr`).then((r) => r.data),
  revokeQr: (id: string) => api.post(`/students/${id}/qr/revoke`).then((r) => r.data),

  me: () => api.get<Student>("/me/student").then((r) => r.data),
  myQr: () => api.get<QrCredential | null>("/me/qr").then((r) => r.data),

  enrollments: (status?: string) =>
    api
      .get<{ student: StudentListItem; enrollment: Enrollment }[]>("/enrollments", { params: { status } })
      .then((r) => r.data),

  qrOverview: () =>
    api
      .get<{ student: StudentListItem; status: "ACTIVE" | "REVOKED" | "NONE"; issuedAt: string | null; credentialCount: number }[]>(
        "/qr/credentials",
      )
      .then((r) => r.data),
  scan: (token: string) => api.post<QrScanResult>("/qr/scan", { token }).then((r) => r.data),

  audit: () => api.get<AuditEvent[]>("/audit").then((r) => r.data),

  validateImport: (fileName: string, rows: Record<string, string>[]) =>
    api.post<ImportPreview>("/students/import/validate", { fileName, rows }).then((r) => r.data),
  confirmImport: (importId: string) =>
    api.post<ImportResult>(`/students/import/${importId}/confirm`).then((r) => r.data),
};
