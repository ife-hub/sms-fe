import type { AuditEvent, QrCredential, School, SchoolUser, Student } from "@/types";

/**
 * In-browser mock database, persisted to localStorage so the demo survives reloads.
 * Replace the whole mocks/ folder with the real API when it is ready.
 */

export interface MockAccount {
  username: string;
  password: string;
  mustChangePassword: boolean;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | "INVITED";
}

export interface MockSchoolUser extends SchoolUser {
  account: MockAccount;
}

export interface MockImport {
  id: string;
  fileName: string;
  validRows: Record<string, string>[];
  totalRows: number;
  issues: { row: number; field: string; message: string; severity: "error" | "warning" }[];
  result?: {
    successfulRows: number;
    failedRows: number;
  };
}

export interface MockDb {
  school: School;
  users: MockSchoolUser[];
  students: Student[];
  studentAccounts: Record<string, MockAccount>;
  qrTokens: Record<string, string>; // credentialId -> raw token (a real API stores only a hash)
  audit: AuditEvent[];
  imports: MockImport[];
}

const KEY = "sms-mock-db-v1";
export const REFRESH_KEY = "sms-mock-refresh";

export function randomHex(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function uid() {
  return crypto.randomUUID();
}

export function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("") + "#7";
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const FIRST_M = ["Chinedu", "Tobi", "Emeka", "Ayo", "Ifeanyi", "Samuel", "Kelechi", "David", "Musa", "Daniel", "Femi", "Tunde"];
const FIRST_F = ["Amara", "Ngozi", "Funke", "Zainab", "Blessing", "Halima", "Chiamaka", "Temi", "Ruth", "Ada", "Kemi", "Sade"];
const LAST = ["Okafor", "Adeyemi", "Bello", "Nwosu", "Ibrahim", "Eze", "Balogun", "Okoro", "Lawal", "Obi", "Afolabi", "Danjuma"];
const STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "PENDING", "ACTIVE", "SUSPENDED", "ACTIVE", "WITHDRAWN", "ACTIVE", "GRADUATED", "ACTIVE"] as const;

function seed(): MockDb {
  const school: School = {
    id: "school-1",
    code: "GRN",
    name: "Greenfield Academy",
    email: "office@greenfield.example",
    phone: "+234 801 234 5678",
    address: "14 Palm Avenue, Ikeja, Lagos",
    logoUrl: null,
    status: "ACTIVE",
  };

  const mkUser = (
    id: string,
    firstName: string,
    lastName: string,
    role: SchoolUser["role"],
    username: string,
    password: string,
    staffNumber: string,
    status: SchoolUser["status"] = "ACTIVE",
  ): MockSchoolUser => ({
    id,
    firstName,
    lastName,
    email: `${username}@greenfield.example`,
    phone: null,
    staffNumber,
    role,
    status,
    joinedAt: status === "INVITED" ? null : daysAgo(120),
    account: { username, password, mustChangePassword: false, status },
  });

  const users = [
    mkUser("u-super", "Adaeze", "Nwankwo", "SUPER_ADMIN", "superadmin", "Password123!", "STF-001"),
    mkUser("u-admin", "Segun", "Adebayo", "ADMIN", "admin", "Password123!", "STF-002"),
    mkUser("u-staff", "Grace", "Okonkwo", "STAFF", "staff", "Password123!", "STF-003"),
    mkUser("u-staff2", "Ibrahim", "Sani", "STAFF", "isani", "Password123!", "STF-004"),
    mkUser("u-staff3", "Peace", "Udo", "STAFF", "pudo", "Password123!", "STF-005", "INVITED"),
  ];

  const students: Student[] = [];
  const studentAccounts: MockDb["studentAccounts"] = {};
  const qrTokens: MockDb["qrTokens"] = {};

  for (let i = 0; i < 28; i++) {
    const female = i % 2 === 1;
    const first = (female ? FIRST_F : FIRST_M)[i % 12];
    const last = LAST[(i * 5 + 3) % 12];
    const admission = `2024-${String(i + 1).padStart(3, "0")}`;
    const id = `stu-${i + 1}`;
    const status = STATUSES[i % STATUSES.length];
    const enrolledAt = daysAgo(300 - i * 4);
    const student: Student = {
      id,
      admissionNumber: admission,
      firstName: first,
      middleName: i % 4 === 0 ? "Chukwuemeka" : null,
      lastName: last,
      dateOfBirth: new Date(2010 + (i % 5), i % 12, (i % 27) + 1).toISOString().slice(0, 10),
      gender: female ? "FEMALE" : "MALE",
      email: null,
      phone: null,
      address: `${i + 3} Unity Road, Lagos`,
      profileImageUrl: null,
      status,
      hasAccount: false,
      username: null,
      accountStatus: null,
      createdAt: enrolledAt,
      guardians: [
        {
          id: `g-${i + 1}-1`,
          fullName: `${i % 3 === 0 ? "Mr" : "Mrs"} ${last}`,
          relationship: i % 3 === 0 ? "Father" : "Mother",
          email: `${last.toLowerCase()}${i}@mail.example`,
          phone: `+234 80${i % 10} 555 ${String(1000 + i * 7).slice(0, 4)}`,
          alternativePhone: null,
          address: null,
          isPrimary: true,
          isEmergency: true,
        },
      ],
      enrollments: [
        {
          id: `e-${i + 1}-1`,
          studentId: id,
          admissionNumber: admission,
          enrollmentDate: enrolledAt.slice(0, 10),
          status,
          academicSession: null,
          exitDate: status === "WITHDRAWN" || status === "GRADUATED" ? daysAgo(10).slice(0, 10) : null,
          exitReason: status === "WITHDRAWN" ? "Relocated" : null,
          createdAt: enrolledAt,
        },
      ],
      qrCredentials: [],
    };

    // Accounts: student 1 has a settled password, student 2 still has a temporary one.
    if (i < 8 && status !== "PENDING") {
      const username = `${school.code}-${admission}`.toLowerCase();
      student.hasAccount = true;
      student.username = username;
      student.accountStatus = "ACTIVE";
      studentAccounts[id] = {
        username,
        password: i === 0 ? "Student#2026!" : "Temp#Pass2026",
        mustChangePassword: i !== 0,
        status: "ACTIVE",
      };
    }
    if (i < 6 && status === "ACTIVE") {
      const cred: QrCredential = { id: `qr-${i + 1}`, studentId: id, status: "ACTIVE", createdAt: daysAgo(60) };
      qrTokens[cred.id] = randomHex();
      student.qrCredentials.push(cred);
    }
    students.push(student);
  }

  // A revoked credential in history for student 1
  students[0].qrCredentials.unshift({
    id: "qr-old-1",
    studentId: "stu-1",
    status: "REVOKED",
    createdAt: daysAgo(200),
    revokedAt: daysAgo(61),
  });
  qrTokens["qr-old-1"] = randomHex();

  const audit: AuditEvent[] = [
    { id: "a1", category: "SCHOOL_USER", action: "Invited school user", actor: "Adaeze Nwankwo", target: "Peace Udo", result: "SUCCESS", occurredAt: daysAgo(3) },
    { id: "a2", category: "QR", action: "QR issued", actor: "Segun Adebayo", target: "Chinedu Okoro", result: "SUCCESS", occurredAt: daysAgo(2) },
    { id: "a3", category: "AUTHORIZATION", action: "Attempted to manage a Super Administrator", actor: "Segun Adebayo", target: "Adaeze Nwankwo", result: "DENIED", occurredAt: daysAgo(1) },
  ];

  return { school, users, students, studentAccounts, qrTokens, audit, imports: [] };
}

let cache: MockDb | null = null;

export function getDb(): MockDb {
  if (cache) return cache;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    cache = raw ? (JSON.parse(raw) as MockDb) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

export function saveDb() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full or unavailable: the demo keeps working from memory */
  }
}

export function resetDb() {
  cache = seed();
  saveDb();
  localStorage.removeItem(REFRESH_KEY);
}

export function addAudit(e: Omit<AuditEvent, "id" | "occurredAt">) {
  const db = getDb();
  db.audit.unshift({ ...e, id: uid(), occurredAt: new Date().toISOString() });
  db.audit = db.audit.slice(0, 200);
}
