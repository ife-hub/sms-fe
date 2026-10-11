export type RoleKey = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "STUDENT";

export type UserStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
export type StudentStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "WITHDRAWN" | "GRADUATED";
export type EnrollmentStatus = StudentStatus;
export type Gender = "MALE" | "FEMALE";
export type QrStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  role: RoleKey;
  permissions: string[];
  schoolId: string;
  schoolName: string;
  /** Present only for student accounts */
  studentId?: string | null;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface School {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string | null;
  status: "ACTIVE" | "SUSPENDED";
}

export interface SchoolUser {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phone?: string | null;
  staffNumber?: string | null;
  role: Exclude<RoleKey, "STUDENT">;
  status: UserStatus;
  joinedAt?: string | null;
}

export interface GuardianContact {
  id: string;
  fullName: string;
  relationship: string;
  email?: string | null;
  phone?: string | null;
  alternativePhone?: string | null;
  address?: string | null;
  isPrimary: boolean;
  isEmergency: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  admissionNumber: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  academicSession?: string | null;
  exitDate?: string | null;
  exitReason?: string | null;
  createdAt: string;
}

export interface QrCredential {
  id: string;
  studentId: string;
  status: QrStatus;
  /** Opaque token. In production this is only returned once, at issue time. */
  token?: string;
  createdAt: string;
  revokedAt?: string | null;
}

export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  profileImageUrl?: string | null;
  status: StudentStatus;
  hasAccount: boolean;
  username?: string | null;
  accountStatus?: UserStatus | null;
  createdAt: string;
  guardians: GuardianContact[];
  enrollments: Enrollment[];
  qrCredentials: QrCredential[];
}

export interface StudentListItem {
  id: string;
  admissionNumber: string;
  fullName: string;
  gender: Gender;
  status: StudentStatus;
  hasAccount: boolean;
  hasActiveQr: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditEvent {
  id: string;
  category: "AUTHENTICATION" | "AUTHORIZATION" | "SCHOOL_USER" | "STUDENT" | "ENROLLMENT" | "QR";
  action: string;
  actor: string;
  target?: string;
  result: "SUCCESS" | "DENIED" | "FAILURE";
  occurredAt: string;
}

export interface DashboardSummary {
  students?: { total: number; active: number; pending: number; withoutAccount: number };
  staff?: { total: number; active: number; invited: number };
  qr?: { active: number; revoked: number };
  recentStudents?: StudentListItem[];
}

export interface QrScanResult {
  fullName: string;
  admissionNumber: string;
  schoolName: string;
  profileImageUrl?: string | null;
  enrollmentStatus: EnrollmentStatus;
  qrStatus: QrStatus;
}

export interface ImportRowIssue {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ImportPreview {
  importId: string;
  totalRows: number;
  validRows: number;
  issues: ImportRowIssue[];
}

export interface ImportResult {
  importId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  issues: ImportRowIssue[];
}
