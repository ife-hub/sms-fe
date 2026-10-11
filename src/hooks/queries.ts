"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolService, staffService } from "@/services/school";
import { studentsService, type StudentListParams } from "@/services/students";
import type { EnrollmentUpdateValues, GuardianValues } from "@/validation/schemas";

export const qk = {
  summary: ["summary"] as const,
  school: ["school"] as const,
  staff: ["staff"] as const,
  students: (p: StudentListParams) => ["students", p] as const,
  student: (id: string) => ["student", id] as const,
  me: ["me", "student"] as const,
  myQr: ["me", "qr"] as const,
  enrollments: (status?: string) => ["enrollments", status ?? "all"] as const,
  qrOverview: ["qr", "overview"] as const,
  audit: ["audit"] as const,
};

export const useSummary = () => useQuery({ queryKey: qk.summary, queryFn: schoolService.summary });
export const useSchool = () => useQuery({ queryKey: qk.school, queryFn: schoolService.get });
export const useStaff = (enabled = true) => useQuery({ queryKey: qk.staff, queryFn: staffService.list, enabled });

export const useStudents = (params: StudentListParams) =>
  useQuery({ queryKey: qk.students(params), queryFn: () => studentsService.list(params), placeholderData: keepPreviousData });
export const useStudent = (id: string) => useQuery({ queryKey: qk.student(id), queryFn: () => studentsService.get(id), retry: false });
export const useMyStudent = () => useQuery({ queryKey: qk.me, queryFn: studentsService.me });
export const useMyQr = () => useQuery({ queryKey: qk.myQr, queryFn: studentsService.myQr });
export const useEnrollments = (status?: string) =>
  useQuery({ queryKey: qk.enrollments(status), queryFn: () => studentsService.enrollments(status || undefined) });
export const useQrOverview = () => useQuery({ queryKey: qk.qrOverview, queryFn: studentsService.qrOverview });
export const useAudit = () => useQuery({ queryKey: qk.audit, queryFn: studentsService.audit });

/** Everything a student change can touch. Cheap to refetch, avoids stale lists. */
function useInvalidateStudents() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ["students"] });
    qc.invalidateQueries({ queryKey: ["enrollments"] });
    qc.invalidateQueries({ queryKey: qk.qrOverview });
    qc.invalidateQueries({ queryKey: qk.summary });
    qc.invalidateQueries({ queryKey: qk.audit });
    if (id) qc.invalidateQueries({ queryKey: qk.student(id) });
  };
}

export function useStudentMutations(id: string) {
  const invalidate = useInvalidateStudents();
  const onSuccess = () => invalidate(id);
  return {
    update: useMutation({ mutationFn: (v: Parameters<typeof studentsService.update>[1]) => studentsService.update(id, v), onSuccess }),
    setGuardians: useMutation({ mutationFn: (g: GuardianValues[]) => studentsService.setGuardians(id, g), onSuccess }),
    changeEnrollment: useMutation({ mutationFn: (v: EnrollmentUpdateValues) => studentsService.changeEnrollment(id, v), onSuccess }),
    activateAccount: useMutation({ mutationFn: () => studentsService.activateAccount(id), onSuccess }),
    resetPassword: useMutation({ mutationFn: () => studentsService.resetPassword(id), onSuccess }),
    setAccountStatus: useMutation({
      mutationFn: (s: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") => studentsService.setAccountStatus(id, s),
      onSuccess,
    }),
    issueQr: useMutation({ mutationFn: () => studentsService.issueQr(id), onSuccess }),
    revokeQr: useMutation({ mutationFn: () => studentsService.revokeQr(id), onSuccess }),
  };
}

export function useCreateStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({ mutationFn: studentsService.create, onSuccess: () => invalidate() });
}

export function useStaffMutations() {
  const qc = useQueryClient();
  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: qk.staff });
    qc.invalidateQueries({ queryKey: qk.summary });
    qc.invalidateQueries({ queryKey: qk.audit });
  };
  return {
    invite: useMutation({ mutationFn: staffService.invite, onSuccess }),
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED" }) => staffService.setStatus(id, status),
      onSuccess,
    }),
    setRole: useMutation({
      mutationFn: ({ id, role }: { id: string; role: "ADMIN" | "STAFF" }) => staffService.setRole(id, role),
      onSuccess,
    }),
  };
}

export function useUpdateSchool() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: schoolService.update, onSuccess: () => qc.invalidateQueries({ queryKey: qk.school }) });
}

export function useImport() {
  const invalidate = useInvalidateStudents();
  return {
    validate: useMutation({ mutationFn: ({ fileName, rows }: { fileName: string; rows: Record<string, string>[] }) => studentsService.validateImport(fileName, rows) }),
    confirm: useMutation({ mutationFn: (importId: string) => studentsService.confirmImport(importId), onSuccess: () => invalidate() }),
  };
}
