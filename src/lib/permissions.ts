import type { RoleKey } from "@/types";

/**
 * Permission keys. These mirror the `Permission.key` values the backend will return
 * on the authenticated user. Until the API exists, ROLE_PERMISSIONS (taken from the
 * PRD section 3.5 matrix) is used by the mock server to populate them.
 *
 * "Limited" capabilities in the PRD (staff updating students, enrollments, guardians)
 * are expressed as separate `.limited` keys so the UI can restrict fields.
 */
export const P = {
  SCHOOL_VIEW: "school.view",
  SCHOOL_VIEW_BASIC: "school.view.basic",
  SCHOOL_UPDATE: "school.update",
  ADMINS_MANAGE: "admins.manage",
  STAFF_MANAGE: "staff.manage",
  STUDENTS_CREATE: "students.create",
  STUDENTS_IMPORT: "students.import",
  STUDENTS_VIEW: "students.view",
  STUDENTS_VIEW_OWN: "students.view.own",
  STUDENTS_UPDATE: "students.update",
  STUDENTS_UPDATE_LIMITED: "students.update.limited",
  ENROLLMENT_MANAGE: "enrollment.manage",
  ENROLLMENT_MANAGE_LIMITED: "enrollment.manage.limited",
  GUARDIANS_MANAGE: "guardians.manage",
  GUARDIANS_MANAGE_LIMITED: "guardians.manage.limited",
  STUDENT_ACCOUNT_MANAGE: "student-account.manage",
  QR_ISSUE: "qr.issue",
  QR_REVOKE: "qr.revoke",
  QR_SCAN: "qr.scan",
  QR_VIEW_OWN: "qr.view.own",
  AUDIT_VIEW: "audit.view",
  AUDIT_VIEW_LIMITED: "audit.view.limited",
} as const;

export type PermissionKey = (typeof P)[keyof typeof P];

const adminCore: PermissionKey[] = [
  P.SCHOOL_VIEW,
  P.STAFF_MANAGE,
  P.STUDENTS_CREATE,
  P.STUDENTS_IMPORT,
  P.STUDENTS_VIEW,
  P.STUDENTS_UPDATE,
  P.ENROLLMENT_MANAGE,
  P.GUARDIANS_MANAGE,
  P.STUDENT_ACCOUNT_MANAGE,
  P.QR_ISSUE,
  P.QR_REVOKE,
  P.QR_SCAN,
];

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  SUPER_ADMIN: [...adminCore, P.SCHOOL_UPDATE, P.ADMINS_MANAGE, P.AUDIT_VIEW],
  ADMIN: [...adminCore, P.AUDIT_VIEW_LIMITED],
  STAFF: [
    P.SCHOOL_VIEW_BASIC,
    P.STUDENTS_CREATE,
    P.STUDENTS_VIEW,
    P.STUDENTS_UPDATE_LIMITED,
    P.ENROLLMENT_MANAGE_LIMITED,
    P.GUARDIANS_MANAGE_LIMITED,
    P.QR_SCAN,
  ],
  STUDENT: [P.SCHOOL_VIEW_BASIC, P.STUDENTS_VIEW_OWN, P.QR_VIEW_OWN],
};

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super administrator",
  ADMIN: "Administrator",
  STAFF: "Staff",
  STUDENT: "Student",
};
