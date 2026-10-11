import * as yup from "yup";

const optionalString = () =>
  yup
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .optional();

const phone = () =>
  yup
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .matches(/^\+?[0-9\s-]{7,18}$/, "Enter a valid phone number")
    .optional();

const email = () =>
  yup
    .string()
    .trim()
    .lowercase()
    .transform((v) => (v === "" ? undefined : v))
    .email("Enter a valid email address")
    .optional();

export const STUDENT_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "WITHDRAWN", "GRADUATED"] as const;
export const GENDERS = ["MALE", "FEMALE"] as const;
export const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Sibling", "Grandparent", "Uncle", "Aunt", "Other"] as const;

export const loginSchema = yup.object({
  identifier: yup.string().trim().required("Enter your username or email"),
  password: yup.string().required("Enter your password"),
});
export type LoginValues = yup.InferType<typeof loginSchema>;

export const passwordRule = yup
  .string()
  .required("Enter a new password")
  .min(10, "Use at least 10 characters")
  .matches(/[a-z]/, "Include a lowercase letter")
  .matches(/[A-Z]/, "Include an uppercase letter")
  .matches(/[0-9]/, "Include a number")
  .matches(/[^A-Za-z0-9]/, "Include a symbol");

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required("Enter your current password"),
  newPassword: passwordRule.notOneOf([yup.ref("currentPassword")], "Choose a password you have not used"),
  confirmPassword: yup
    .string()
    .required("Confirm your new password")
    .oneOf([yup.ref("newPassword")], "Passwords do not match"),
});
export type ChangePasswordValues = yup.InferType<typeof changePasswordSchema>;

export const schoolSchema = yup.object({
  name: yup.string().trim().required("Enter the school name"),
  email: yup.string().trim().lowercase().email("Enter a valid email address").required("Enter a contact email"),
  phone: yup
    .string()
    .trim()
    .matches(/^\+?[0-9\s-]{7,18}$/, "Enter a valid phone number")
    .required("Enter a phone number"),
  address: yup.string().trim().required("Enter the school address"),
});
export type SchoolValues = yup.InferType<typeof schoolSchema>;

export const schoolUserSchema = yup.object({
  firstName: yup.string().trim().required("Enter a first name"),
  middleName: optionalString(),
  lastName: yup.string().trim().required("Enter a last name"),
  staffNumber: optionalString(),
  email: yup.string().trim().lowercase().email("Enter a valid email address").required("Enter an email address"),
  phone: phone(),
  role: yup.string().oneOf(["ADMIN", "STAFF"]).required("Choose a role"),
});
export type SchoolUserValues = yup.InferType<typeof schoolUserSchema>;

export const guardianSchema = yup.object({
  fullName: yup.string().trim().required("Enter the guardian's name"),
  relationship: yup.string().required("Choose a relationship"),
  email: email(),
  phone: phone(),
  alternativePhone: phone(),
  address: optionalString(),
  isPrimary: yup.boolean().required(),
  isEmergency: yup.boolean().required(),
});
export type GuardianValues = yup.InferType<typeof guardianSchema>;

export const studentSchema = yup.object({
  admissionNumber: yup
    .string()
    .trim()
    .matches(/^[A-Za-z0-9/-]+$/, "Use letters, numbers, hyphens or slashes only")
    .required("Enter an admission number"),
  firstName: yup.string().trim().required("Enter a first name"),
  middleName: optionalString(),
  lastName: yup.string().trim().required("Enter a last name"),
  dateOfBirth: yup
    .string()
    .required("Enter a date of birth")
    .test("past", "Date of birth must be in the past", (v) => !!v && new Date(v) < new Date()),
  gender: yup.string().oneOf(GENDERS).required("Choose a gender"),
  email: email(),
  phone: phone(),
  address: optionalString(),
  status: yup.string().oneOf(STUDENT_STATUSES).required("Choose a status"),
  enrollmentDate: yup.string().required("Enter an enrollment date"),
  guardians: yup
    .array()
    .of(guardianSchema)
    .required()
    .test("one-primary", "Only one guardian can be the primary contact", (list) => (list ?? []).filter((g) => g.isPrimary).length <= 1),
});
export type StudentValues = yup.InferType<typeof studentSchema>;

export const enrollmentUpdateSchema = yup.object({
  status: yup.string().oneOf(STUDENT_STATUSES).required("Choose a status"),
  enrollmentDate: yup.string().required("Enter a date"),
  exitDate: yup
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .when("status", {
      is: (s: string) => s === "WITHDRAWN" || s === "GRADUATED",
      then: (s) => s.required("Enter the exit date"),
      otherwise: (s) => s.optional(),
    }),
  exitReason: optionalString(),
});
export type EnrollmentUpdateValues = yup.InferType<typeof enrollmentUpdateSchema>;

export const qrScanSchema = yup.object({
  token: yup.string().trim().required("Scan a code or paste the credential"),
});
export type QrScanValues = yup.InferType<typeof qrScanSchema>;

/** Row-level validation used by bulk import. Mirrors the PRD column list. */
export const importRowSchema = yup.object({
  admission_number: yup.string().trim().required("Admission number is required"),
  first_name: yup.string().trim().required("First name is required"),
  middle_name: optionalString(),
  last_name: yup.string().trim().required("Last name is required"),
  date_of_birth: yup
    .string()
    .required("Date of birth is required (YYYY-MM-DD)")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
    .test("past", "Date of birth must be in the past", (v) => !!v && new Date(v) < new Date()),
  gender: yup
    .string()
    .transform((v) => (v ? String(v).toUpperCase() : v))
    .oneOf(GENDERS, "Gender must be MALE or FEMALE")
    .required("Gender is required"),
  student_email: email(),
  student_phone: phone(),
  address: optionalString(),
  enrollment_date: yup
    .string()
    .required("Enrollment date is required (YYYY-MM-DD)")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD"),
  enrollment_status: yup
    .string()
    .transform((v) => (v ? String(v).toUpperCase() : "PENDING"))
    .oneOf(STUDENT_STATUSES, "Unknown enrollment status"),
  primary_guardian_name: optionalString(),
  primary_guardian_relationship: optionalString(),
  primary_guardian_email: email(),
  primary_guardian_phone: phone(),
  secondary_guardian_name: optionalString(),
  secondary_guardian_relationship: optionalString(),
  secondary_guardian_email: email(),
  secondary_guardian_phone: phone(),
  create_student_account: yup
    .string()
    .transform((v) => (v ? String(v).toUpperCase() : "NO"))
    .oneOf(["YES", "NO"], "Use YES or NO"),
  issue_qr_credential: yup
    .string()
    .transform((v) => (v ? String(v).toUpperCase() : "NO"))
    .oneOf(["YES", "NO"], "Use YES or NO"),
});

export const IMPORT_COLUMNS = [
  "admission_number",
  "first_name",
  "middle_name",
  "last_name",
  "date_of_birth",
  "gender",
  "student_email",
  "student_phone",
  "address",
  "enrollment_date",
  "enrollment_status",
  "primary_guardian_name",
  "primary_guardian_relationship",
  "primary_guardian_email",
  "primary_guardian_phone",
  "secondary_guardian_name",
  "secondary_guardian_relationship",
  "secondary_guardian_email",
  "secondary_guardian_phone",
  "create_student_account",
  "issue_qr_credential",
] as const;
