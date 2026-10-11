import { http, HttpResponse, delay } from "msw";
import { addAudit, getDb, randomHex, REFRESH_KEY, saveDb, tempPassword, uid, type MockAccount } from "./db";
import { importRowSchema } from "@/validation/schemas";
import { P, ROLE_PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import type {
  AuthUser,
  DashboardSummary,
  Enrollment,
  GuardianContact,
  ImportRowIssue,
  RoleKey,
  Student,
  StudentListItem,
} from "@/types";

const ACCESS_TTL_SECONDS = 120; // short on purpose so you can watch the interceptor refresh the token

const url = (path: string) => `*/api${path}`;
const forbidden = () => HttpResponse.json({ message: "Forbidden" }, { status: 403 });
const notFound = () => HttpResponse.json({ message: "Not found" }, { status: 404 });
const unauthorized = () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 });

function b64(obj: unknown) {
  return btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function signToken(sub: string) {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub, exp })}.mock`;
}
function readToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(atob(header.slice(7).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp * 1000 <= Date.now()) return null;
    return payload.sub as string;
  } catch {
    return null;
  }
}

function buildAuthUser(sub: string): AuthUser | null {
  const db = getDb();
  if (sub.startsWith("u:")) {
    const u = db.users.find((x) => x.id === sub.slice(2));
    if (!u || u.account.status !== "ACTIVE") return null;
    return {
      id: u.id,
      username: u.account.username,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      permissions: ROLE_PERMISSIONS[u.role],
      schoolId: db.school.id,
      schoolName: db.school.name,
      studentId: null,
      mustChangePassword: u.account.mustChangePassword,
    };
  }
  const s = db.students.find((x) => x.id === sub.slice(2));
  const acct = s ? db.studentAccounts[s.id] : undefined;
  if (!s || !acct || acct.status !== "ACTIVE") return null;
  return {
    id: `acct-${s.id}`,
    username: acct.username,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    role: "STUDENT",
    permissions: ROLE_PERMISSIONS.STUDENT,
    schoolId: db.school.id,
    schoolName: db.school.name,
    studentId: s.id,
    mustChangePassword: acct.mustChangePassword,
  };
}

/** Resolve the caller and check a permission. Denials are audited and reveal nothing. */
function authorize(request: Request, ...anyOf: PermissionKey[]) {
  const sub = readToken(request);
  if (!sub) return { error: unauthorized() } as const;
  const user = buildAuthUser(sub);
  if (!user) return { error: unauthorized() } as const;
  if (anyOf.length && !anyOf.some((p) => user.permissions.includes(p))) {
    addAudit({
      category: "AUTHORIZATION",
      action: `Forbidden request (${anyOf.join(" or ")})`,
      actor: `${user.firstName} ${user.lastName}`,
      result: "DENIED",
    });
    saveDb();
    return { error: forbidden() } as const;
  }
  return { user } as const;
}

const actorName = (u: AuthUser) => `${u.firstName} ${u.lastName}`;
const studentName = (s: Student) => `${s.firstName} ${s.lastName}`;

function toListItem(s: Student): StudentListItem {
  return {
    id: s.id,
    admissionNumber: s.admissionNumber,
    fullName: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
    gender: s.gender,
    status: s.status,
    hasAccount: s.hasAccount,
    hasActiveQr: s.qrCredentials.some((c) => c.status === "ACTIVE"),
  };
}

function stripTokens(s: Student): Student {
  // Raw QR tokens are only ever returned at issue time (or to the owning student).
  return { ...s, qrCredentials: s.qrCredentials.map(({ token: _t, ...rest }) => rest) };
}

function createStudent(input: {
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status: Student["status"];
  enrollmentDate: string;
  guardians: Omit<GuardianContact, "id">[];
}): Student {
  const id = uid();
  const now = new Date().toISOString();
  return {
    id,
    admissionNumber: input.admissionNumber,
    firstName: input.firstName,
    middleName: input.middleName ?? null,
    lastName: input.lastName,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    profileImageUrl: null,
    status: input.status,
    hasAccount: false,
    username: null,
    accountStatus: null,
    createdAt: now,
    guardians: input.guardians.map((g) => ({ ...g, id: uid() })),
    enrollments: [
      {
        id: uid(),
        studentId: id,
        admissionNumber: input.admissionNumber,
        enrollmentDate: input.enrollmentDate,
        status: input.status,
        academicSession: null,
        exitDate: null,
        exitReason: null,
        createdAt: now,
      },
    ],
    qrCredentials: [],
  };
}

function activateAccount(student: Student) {
  const db = getDb();
  const username = `${db.school.code}-${student.admissionNumber}`.toLowerCase();
  const password = tempPassword();
  db.studentAccounts[student.id] = { username, password, mustChangePassword: true, status: "ACTIVE" };
  student.hasAccount = true;
  student.username = username;
  student.accountStatus = "ACTIVE";
  return { username, temporaryPassword: password };
}

function issueQr(student: Student) {
  const db = getDb();
  student.qrCredentials.forEach((c) => {
    if (c.status === "ACTIVE") {
      c.status = "REVOKED";
      c.revokedAt = new Date().toISOString();
    }
  });
  const cred = { id: uid(), studentId: student.id, status: "ACTIVE" as const, createdAt: new Date().toISOString() };
  db.qrTokens[cred.id] = randomHex();
  student.qrCredentials.unshift(cred);
  return { ...cred, token: db.qrTokens[cred.id] };
}

export const handlers = [
  /* ---------------------------- auth ---------------------------- */
  http.post(url("/auth/login"), async ({ request }) => {
    await delay(400);
    const { identifier, password } = (await request.json()) as { identifier: string; password: string };
    const db = getDb();
    const id = identifier.trim().toLowerCase();

    let sub: string | null = null;
    let account: MockAccount | undefined;
    let who = identifier;

    const su = db.users.find((u) => u.account.username.toLowerCase() === id || u.email.toLowerCase() === id);
    if (su) {
      sub = `u:${su.id}`;
      account = su.account;
      who = `${su.firstName} ${su.lastName}`;
    } else {
      const stu = db.students.find((s) => db.studentAccounts[s.id]?.username.toLowerCase() === id);
      if (stu) {
        sub = `s:${stu.id}`;
        account = db.studentAccounts[stu.id];
        who = studentName(stu);
      }
    }

    if (!sub || !account || account.password !== password || account.status !== "ACTIVE") {
      addAudit({ category: "AUTHENTICATION", action: "Login failed", actor: who, result: "FAILURE" });
      saveDb();
      return HttpResponse.json({ message: "The username or password is incorrect." }, { status: 401 });
    }

    localStorage.setItem(REFRESH_KEY, sub);
    const user = buildAuthUser(sub)!;
    return HttpResponse.json({ accessToken: signToken(sub), user });
  }),

  http.post(url("/auth/refresh"), async () => {
    await delay(150);
    const sub = localStorage.getItem(REFRESH_KEY);
    const user = sub ? buildAuthUser(sub) : null;
    if (!sub || !user) return unauthorized();
    return HttpResponse.json({ accessToken: signToken(sub), user });
  }),

  http.post(url("/auth/logout"), async () => {
    localStorage.removeItem(REFRESH_KEY);
    return HttpResponse.json({ ok: true });
  }),

  http.post(url("/auth/change-password"), async ({ request }) => {
    await delay(400);
    const auth = authorize(request);
    if ("error" in auth) return auth.error;
    const { currentPassword, newPassword } = (await request.json()) as { currentPassword: string; newPassword: string };
    const db = getDb();
    const account =
      auth.user.role === "STUDENT"
        ? db.studentAccounts[auth.user.studentId!]
        : db.users.find((u) => u.id === auth.user.id)?.account;
    if (!account || account.password !== currentPassword) {
      return HttpResponse.json({ message: "Your current password is incorrect." }, { status: 400 });
    }
    account.password = newPassword;
    account.mustChangePassword = false;
    addAudit({ category: "AUTHENTICATION", action: "Password changed", actor: actorName(auth.user), result: "SUCCESS" });
    saveDb();
    const sub = auth.user.role === "STUDENT" ? `s:${auth.user.studentId}` : `u:${auth.user.id}`;
    return HttpResponse.json({ user: buildAuthUser(sub) });
  }),

  /* -------------------------- dashboard ------------------------- */
  http.get(url("/dashboard/summary"), async ({ request }) => {
    await delay(300);
    const auth = authorize(request);
    if ("error" in auth) return auth.error;
    const db = getDb();
    const has = (p: PermissionKey) => auth.user.permissions.includes(p);
    const summary: DashboardSummary = {};
    if (has(P.STUDENTS_VIEW)) {
      summary.students = {
        total: db.students.length,
        active: db.students.filter((s) => s.status === "ACTIVE").length,
        pending: db.students.filter((s) => s.status === "PENDING").length,
        withoutAccount: db.students.filter((s) => !s.hasAccount).length,
      };
      summary.recentStudents = [...db.students]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map(toListItem);
    }
    if (has(P.STAFF_MANAGE)) {
      const staff = db.users.filter((u) => u.role !== "SUPER_ADMIN");
      summary.staff = {
        total: staff.length,
        active: staff.filter((u) => u.status === "ACTIVE").length,
        invited: staff.filter((u) => u.status === "INVITED").length,
      };
    }
    if (has(P.QR_ISSUE)) {
      const creds = db.students.flatMap((s) => s.qrCredentials);
      summary.qr = {
        active: creds.filter((c) => c.status === "ACTIVE").length,
        revoked: creds.filter((c) => c.status === "REVOKED").length,
      };
    }
    return HttpResponse.json(summary);
  }),

  /* ---------------------------- school -------------------------- */
  http.get(url("/school"), async ({ request }) => {
    await delay(250);
    const auth = authorize(request, P.SCHOOL_VIEW, P.SCHOOL_VIEW_BASIC);
    if ("error" in auth) return auth.error;
    const { school } = getDb();
    if (auth.user.permissions.includes(P.SCHOOL_VIEW)) return HttpResponse.json(school);
    return HttpResponse.json({ id: school.id, name: school.name, code: school.code, logoUrl: school.logoUrl, status: school.status });
  }),

  http.patch(url("/school"), async ({ request }) => {
    await delay(400);
    const auth = authorize(request, P.SCHOOL_UPDATE);
    if ("error" in auth) return auth.error;
    const db = getDb();
    Object.assign(db.school, await request.json());
    addAudit({ category: "SCHOOL_USER", action: "School profile updated", actor: actorName(auth.user), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json(db.school);
  }),

  /* ------------------------ administrators/staff ---------------- */
  http.get(url("/staff"), async ({ request }) => {
    await delay(300);
    const auth = authorize(request, P.STAFF_MANAGE);
    if ("error" in auth) return auth.error;
    const db = getDb();
    const canSeeAdmins = auth.user.permissions.includes(P.ADMINS_MANAGE);
    const list = db.users.filter((u) => canSeeAdmins || u.role === "STAFF").map(({ account: _a, ...u }) => u);
    return HttpResponse.json(list);
  }),

  http.post(url("/staff"), async ({ request }) => {
    await delay(500);
    const auth = authorize(request, P.STAFF_MANAGE);
    if ("error" in auth) return auth.error;
    const body = (await request.json()) as {
      firstName: string; middleName?: string; lastName: string; staffNumber?: string; email: string; phone?: string; role: "ADMIN" | "STAFF";
    };
    if (body.role === "ADMIN" && !auth.user.permissions.includes(P.ADMINS_MANAGE)) {
      addAudit({ category: "AUTHORIZATION", action: "Attempted to create an administrator", actor: actorName(auth.user), result: "DENIED" });
      saveDb();
      return forbidden();
    }
    const db = getDb();
    if (db.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      return HttpResponse.json({ message: "A user with this email already exists." }, { status: 409 });
    }
    if (body.staffNumber && db.users.some((u) => u.staffNumber === body.staffNumber)) {
      return HttpResponse.json({ message: "This staff number is already in use." }, { status: 409 });
    }
    const user = {
      id: uid(),
      firstName: body.firstName,
      middleName: body.middleName ?? null,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone ?? null,
      staffNumber: body.staffNumber ?? null,
      role: body.role,
      status: "INVITED" as const,
      joinedAt: null,
      account: { username: body.email.split("@")[0], password: tempPassword(), mustChangePassword: true, status: "INVITED" as const },
    };
    db.users.push(user);
    addAudit({ category: "SCHOOL_USER", action: `Invited ${body.role === "ADMIN" ? "administrator" : "staff member"}`, actor: actorName(auth.user), target: `${body.firstName} ${body.lastName}`, result: "SUCCESS" });
    saveDb();
    const { account: _a, ...out } = user;
    return HttpResponse.json(out, { status: 201 });
  }),

  http.patch(url("/staff/:id/status"), async ({ request, params }) => {
    await delay(350);
    const auth = authorize(request, P.STAFF_MANAGE);
    if ("error" in auth) return auth.error;
    const db = getDb();
    const target = db.users.find((u) => u.id === params.id);
    if (!target) return notFound();
    if (target.role !== "STAFF" && !auth.user.permissions.includes(P.ADMINS_MANAGE)) {
      addAudit({ category: "AUTHORIZATION", action: "Attempted to manage a higher-privilege user", actor: actorName(auth.user), target: `${target.firstName} ${target.lastName}`, result: "DENIED" });
      saveDb();
      return forbidden();
    }
    if (target.role === "SUPER_ADMIN") return forbidden();
    const { status } = (await request.json()) as { status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED" };
    const old = target.status;
    target.status = status;
    target.account.status = status;
    if (status === "ACTIVE" && !target.joinedAt) target.joinedAt = new Date().toISOString();
    addAudit({ category: "SCHOOL_USER", action: `Status ${old} → ${status}`, actor: actorName(auth.user), target: `${target.firstName} ${target.lastName}`, result: "SUCCESS" });
    saveDb();
    return HttpResponse.json({ ok: true });
  }),

  http.patch(url("/staff/:id/role"), async ({ request, params }) => {
    await delay(350);
    const auth = authorize(request, P.ADMINS_MANAGE);
    if ("error" in auth) return auth.error;
    const db = getDb();
    const target = db.users.find((u) => u.id === params.id);
    if (!target || target.role === "SUPER_ADMIN") return forbidden();
    const { role } = (await request.json()) as { role: "ADMIN" | "STAFF" };
    const old = target.role;
    target.role = role;
    addAudit({ category: "SCHOOL_USER", action: `Role ${old} → ${role}`, actor: actorName(auth.user), target: `${target.firstName} ${target.lastName}`, result: "SUCCESS" });
    saveDb();
    return HttpResponse.json({ ok: true });
  }),

  /* ---------------------------- students ------------------------ */
  http.get(url("/students"), async ({ request }) => {
    await delay(300);
    const auth = authorize(request, P.STUDENTS_VIEW);
    if ("error" in auth) return auth.error;
    const q = new URL(request.url).searchParams;
    const search = (q.get("search") ?? "").toLowerCase();
    const status = q.get("status") ?? "";
    const page = Number(q.get("page") ?? 1);
    const pageSize = Number(q.get("pageSize") ?? 10);
    const all = getDb()
      .students.filter((s) => (!status || s.status === status))
      .filter((s) => !search || `${s.firstName} ${s.middleName ?? ""} ${s.lastName} ${s.admissionNumber}`.toLowerCase().includes(search))
      .map(toListItem);
    return HttpResponse.json({ items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, page, pageSize });
  }),

  http.post(url("/students"), async ({ request }) => {
    await delay(500);
    const auth = authorize(request, P.STUDENTS_CREATE);
    if ("error" in auth) return auth.error;
    const body = (await request.json()) as Parameters<typeof createStudent>[0];
    const db = getDb();
    if (db.students.some((s) => s.admissionNumber.toLowerCase() === body.admissionNumber.toLowerCase())) {
      return HttpResponse.json({ message: `Admission number ${body.admissionNumber} is already in use.` }, { status: 409 });
    }
    const student = createStudent(body);
    db.students.unshift(student);
    addAudit({ category: "STUDENT", action: "Student created", actor: actorName(auth.user), target: studentName(student), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json(stripTokens(student), { status: 201 });
  }),

  http.get(url("/students/:id"), async ({ request, params }) => {
    await delay(250);
    const auth = authorize(request);
    if ("error" in auth) return auth.error;
    const s = getDb().students.find((x) => x.id === params.id);
    // Students and unauthorized roles get the same answer as for a record that does not exist.
    if (!s || !auth.user.permissions.includes(P.STUDENTS_VIEW)) return notFound();
    return HttpResponse.json(stripTokens(s));
  }),

  http.patch(url("/students/:id"), async ({ request, params }) => {
    await delay(400);
    const auth = authorize(request, P.STUDENTS_UPDATE, P.STUDENTS_UPDATE_LIMITED);
    if ("error" in auth) return auth.error;
    const s = getDb().students.find((x) => x.id === params.id);
    if (!s) return notFound();
    const body = (await request.json()) as Partial<Student>;
    const limited = !auth.user.permissions.includes(P.STUDENTS_UPDATE);
    const allowed = limited ? ["email", "phone", "address"] : ["firstName", "middleName", "lastName", "dateOfBirth", "gender", "email", "phone", "address"];
    for (const k of allowed) if (k in body) (s as unknown as Record<string, unknown>)[k] = (body as Record<string, unknown>)[k];
    addAudit({ category: "STUDENT", action: "Student edited", actor: actorName(auth.user), target: studentName(s), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json(stripTokens(s));
  }),

  http.put(url("/students/:id/guardians"), async ({ request, params }) => {
    await delay(400);
    const auth = authorize(request, P.GUARDIANS_MANAGE, P.GUARDIANS_MANAGE_LIMITED);
    if ("error" in auth) return auth.error;
    const s = getDb().students.find((x) => x.id === params.id);
    if (!s) return notFound();
    const { guardians } = (await request.json()) as { guardians: Omit<GuardianContact, "id">[] };
    s.guardians = guardians.map((g) => ({ ...g, id: uid() }));
    addAudit({ category: "STUDENT", action: "Guardian contacts updated", actor: actorName(auth.user), target: studentName(s), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json(stripTokens(s));
  }),

  http.post(url("/students/:id/enrollments"), async ({ request, params }) => {
    await delay(400);
    const auth = authorize(request, P.ENROLLMENT_MANAGE, P.ENROLLMENT_MANAGE_LIMITED);
    if ("error" in auth) return auth.error;
    const s = getDb().students.find((x) => x.id === params.id);
    if (!s) return notFound();
    const body = (await request.json()) as Pick<Enrollment, "status" | "enrollmentDate" | "exitDate" | "exitReason">;
    const old = s.status;
    s.enrollments.unshift({
      id: uid(),
      studentId: s.id,
      admissionNumber: s.admissionNumber,
      enrollmentDate: body.enrollmentDate,
      status: body.status,
      academicSession: null,
      exitDate: body.exitDate ?? null,
      exitReason: body.exitReason ?? null,
      createdAt: new Date().toISOString(),
    });
    s.status = body.status;
    addAudit({ category: "ENROLLMENT", action: `Enrollment ${old} → ${body.status}`, actor: actorName(auth.user), target: studentName(s), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json(stripTokens(s));
  }),

  http.post(url("/students/:id/account"), async ({ request, params }) => {
    await delay(500);
    const auth = authorize(request, P.STUDENT_ACCOUNT_MANAGE);
    if ("error" in auth) return auth.error;
    const s = getDb().students.find((x) => x.id === params.id);
    if (!s) return notFound();
    if (s.hasAccount) return HttpResponse.json({ message: "This student already has an account." }, { status: 409 });
    const creds = activateAccount(s);
    addAudit({ category: "STUDENT", action: "Student account activated", actor: actorName(auth.user), target: studentName(s), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json(creds, { status: 201 });
  }),

  http.post(url("/students/:id/account/reset"), async ({ request, params }) => {
    await delay(500);
    const auth = authorize(request, P.STUDENT_ACCOUNT_MANAGE);
    if ("error" in auth) return auth.error;
    const db = getDb();
    const s = db.students.find((x) => x.id === params.id);
    const acct = s && db.studentAccounts[s.id];
    if (!s || !acct) return notFound();
    const password = tempPassword();
    acct.password = password;
    acct.mustChangePassword = true;
    addAudit({ category: "AUTHENTICATION", action: "Student password reset", actor: actorName(auth.user), target: studentName(s), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json({ username: acct.username, temporaryPassword: password });
  }),

  http.patch(url("/students/:id/account/status"), async ({ request, params }) => {
    await delay(350);
    const auth = authorize(request, P.STUDENT_ACCOUNT_MANAGE);
    if ("error" in auth) return auth.error;
    const db = getDb();
    const s = db.students.find((x) => x.id === params.id);
    const acct = s && db.studentAccounts[s.id];
    if (!s || !acct) return notFound();
    const { status } = (await request.json()) as { status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED" };
    acct.status = status;
    s.accountStatus = status;
    addAudit({ category: "STUDENT", action: `Student account ${status.toLowerCase()}`, actor: actorName(auth.user), target: studentName(s), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json({ ok: true });
  }),

  http.post(url("/students/:id/qr"), async ({ request, params }) => {
    await delay(450);
    const auth = authorize(request, P.QR_ISSUE);
    if ("error" in auth) return auth.error;
    const s = getDb().students.find((x) => x.id === params.id);
    if (!s) return notFound();
    const reissue = s.qrCredentials.some((c) => c.status === "ACTIVE");
    const cred = issueQr(s);
    addAudit({ category: "QR", action: reissue ? "QR reissued" : "QR issued", actor: actorName(auth.user), target: studentName(s), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json(cred, { status: 201 });
  }),

  http.post(url("/students/:id/qr/revoke"), async ({ request, params }) => {
    await delay(350);
    const auth = authorize(request, P.QR_REVOKE);
    if ("error" in auth) return auth.error;
    const s = getDb().students.find((x) => x.id === params.id);
    if (!s) return notFound();
    s.qrCredentials.forEach((c) => {
      if (c.status === "ACTIVE") {
        c.status = "REVOKED";
        c.revokedAt = new Date().toISOString();
      }
    });
    addAudit({ category: "QR", action: "QR revoked", actor: actorName(auth.user), target: studentName(s), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json({ ok: true });
  }),

  /* --------------------- student self-service ------------------- */
  http.get(url("/me/student"), async ({ request }) => {
    await delay(250);
    const auth = authorize(request, P.STUDENTS_VIEW_OWN);
    if ("error" in auth) return auth.error;
    const s = getDb().students.find((x) => x.id === auth.user.studentId);
    if (!s) return notFound();
    // Own view: no guardian contacts, no QR tokens
    return HttpResponse.json({ ...stripTokens(s), guardians: [] });
  }),

  http.get(url("/me/qr"), async ({ request }) => {
    await delay(250);
    const auth = authorize(request, P.QR_VIEW_OWN);
    if ("error" in auth) return auth.error;
    const db = getDb();
    const s = db.students.find((x) => x.id === auth.user.studentId);
    const cred = s?.qrCredentials.find((c) => c.status === "ACTIVE");
    if (!cred) return HttpResponse.json(null);
    return HttpResponse.json({ ...cred, token: db.qrTokens[cred.id] });
  }),

  /* ------------------------ lists & verification ---------------- */
  http.get(url("/enrollments"), async ({ request }) => {
    await delay(300);
    const auth = authorize(request, P.ENROLLMENT_MANAGE, P.ENROLLMENT_MANAGE_LIMITED);
    if ("error" in auth) return auth.error;
    const status = new URL(request.url).searchParams.get("status");
    const items = getDb()
      .students.map((s) => ({ student: toListItem(s), enrollment: s.enrollments[0] }))
      .filter((r) => !status || r.enrollment.status === status);
    return HttpResponse.json(items);
  }),

  http.get(url("/qr/credentials"), async ({ request }) => {
    await delay(300);
    const auth = authorize(request, P.QR_ISSUE);
    if ("error" in auth) return auth.error;
    const items = getDb().students.map((s) => {
      const active = s.qrCredentials.find((c) => c.status === "ACTIVE");
      return {
        student: toListItem(s),
        status: active ? "ACTIVE" : s.qrCredentials.length ? "REVOKED" : "NONE",
        issuedAt: (active ?? s.qrCredentials[0])?.createdAt ?? null,
        credentialCount: s.qrCredentials.length,
      };
    });
    return HttpResponse.json(items);
  }),

  http.post(url("/qr/scan"), async ({ request }) => {
    await delay(300);
    const auth = authorize(request, P.QR_SCAN);
    if ("error" in auth) return auth.error;
    const { token } = (await request.json()) as { token: string };
    const db = getDb();
    const credId = Object.keys(db.qrTokens).find((id) => db.qrTokens[id] === token.trim());
    const student = credId ? db.students.find((s) => s.qrCredentials.some((c) => c.id === credId)) : undefined;
    const cred = student?.qrCredentials.find((c) => c.id === credId);
    if (!student || !cred || cred.status !== "ACTIVE") {
      addAudit({ category: "QR", action: "QR scan rejected", actor: actorName(auth.user), result: "FAILURE" });
      saveDb();
      return HttpResponse.json({ message: "This code is not valid." }, { status: 404 });
    }
    addAudit({ category: "QR", action: "QR scanned", actor: actorName(auth.user), target: studentName(student), result: "SUCCESS" });
    saveDb();
    return HttpResponse.json({
      fullName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
      admissionNumber: student.admissionNumber,
      schoolName: db.school.name,
      profileImageUrl: student.profileImageUrl,
      enrollmentStatus: student.enrollments[0].status,
      qrStatus: cred.status,
    });
  }),

  http.get(url("/audit"), async ({ request }) => {
    await delay(300);
    const auth = authorize(request, P.AUDIT_VIEW, P.AUDIT_VIEW_LIMITED);
    if ("error" in auth) return auth.error;
    const full = auth.user.permissions.includes(P.AUDIT_VIEW);
    const items = getDb().audit.filter((e) => full || (e.category !== "SCHOOL_USER" && e.category !== "AUTHORIZATION"));
    return HttpResponse.json(items);
  }),

  /* ---------------------------- bulk import --------------------- */
  http.post(url("/students/import/validate"), async ({ request }) => {
    await delay(700);
    const auth = authorize(request, P.STUDENTS_IMPORT);
    if ("error" in auth) return auth.error;
    const { fileName, rows } = (await request.json()) as { fileName: string; rows: Record<string, string>[] };
    const db = getDb();
    const issues: ImportRowIssue[] = [];
    const valid: Record<string, string>[] = [];
    const seen = new Map<string, number>();
    const existing = new Set(db.students.map((s) => s.admissionNumber.toLowerCase()));

    rows.forEach((raw, idx) => {
      const rowNo = idx + 2; // header is row 1
      const rowIssues: ImportRowIssue[] = [];
      try {
        importRowSchema.validateSync(raw, { abortEarly: false });
      } catch (e) {
        const err = e as { inner?: { path?: string; message: string }[] };
        (err.inner ?? []).forEach((i) => rowIssues.push({ row: rowNo, field: i.path ?? "row", message: i.message, severity: "error" }));
      }
      const adm = (raw.admission_number ?? "").trim().toLowerCase();
      if (adm) {
        if (existing.has(adm)) rowIssues.push({ row: rowNo, field: "admission_number", message: "Already exists in this school", severity: "error" });
        if (seen.has(adm)) rowIssues.push({ row: rowNo, field: "admission_number", message: `Duplicate of row ${seen.get(adm)} in this file`, severity: "error" });
        else seen.set(adm, rowNo);
      }
      if (!raw.primary_guardian_name?.trim()) {
        rowIssues.push({ row: rowNo, field: "primary_guardian_name", message: "No guardian contact supplied", severity: "warning" });
      }
      issues.push(...rowIssues);
      if (!rowIssues.some((i) => i.severity === "error")) valid.push(raw);
    });

    const id = uid();
    db.imports.push({ id, fileName, validRows: valid, totalRows: rows.length, issues });
    saveDb();
    return HttpResponse.json({ importId: id, totalRows: rows.length, validRows: valid.length, issues });
  }),

  http.post(url("/students/import/:id/confirm"), async ({ request, params }) => {
    await delay(900);
    const auth = authorize(request, P.STUDENTS_IMPORT);
    if ("error" in auth) return auth.error;
    const db = getDb();
    const imp = db.imports.find((i) => i.id === params.id);
    if (!imp) return notFound();
    // Idempotent: confirming twice never creates duplicates.
    if (!imp.result) {
      let ok = 0;
      for (const r of imp.validRows) {
        const guardians: Omit<GuardianContact, "id">[] = [];
        if (r.primary_guardian_name?.trim()) {
          guardians.push({ fullName: r.primary_guardian_name, relationship: r.primary_guardian_relationship || "Guardian", email: r.primary_guardian_email || null, phone: r.primary_guardian_phone || null, alternativePhone: null, address: null, isPrimary: true, isEmergency: true });
        }
        if (r.secondary_guardian_name?.trim()) {
          guardians.push({ fullName: r.secondary_guardian_name, relationship: r.secondary_guardian_relationship || "Guardian", email: r.secondary_guardian_email || null, phone: r.secondary_guardian_phone || null, alternativePhone: null, address: null, isPrimary: false, isEmergency: false });
        }
        const s = createStudent({
          admissionNumber: r.admission_number.trim(),
          firstName: r.first_name.trim(),
          middleName: r.middle_name || null,
          lastName: r.last_name.trim(),
          dateOfBirth: r.date_of_birth,
          gender: r.gender.toUpperCase() as "MALE" | "FEMALE",
          email: r.student_email || null,
          phone: r.student_phone || null,
          address: r.address || null,
          status: ((r.enrollment_status || "PENDING").toUpperCase() as Student["status"]),
          enrollmentDate: r.enrollment_date,
          guardians,
        });
        if ((r.create_student_account ?? "").toUpperCase() === "YES") activateAccount(s);
        if ((r.issue_qr_credential ?? "").toUpperCase() === "YES") issueQr(s);
        db.students.unshift(s);
        ok++;
      }
      imp.result = { successfulRows: ok, failedRows: imp.totalRows - ok };
      addAudit({ category: "STUDENT", action: `Imported ${ok} students`, actor: actorName(auth.user), result: "SUCCESS" });
      saveDb();
    }
    return HttpResponse.json({
      importId: imp.id,
      totalRows: imp.totalRows,
      successfulRows: imp.result.successfulRows,
      failedRows: imp.result.failedRows,
      issues: imp.issues,
    });
  }),
];

export type { RoleKey };
