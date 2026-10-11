import {
  ClipboardList,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  QrCode,
  ScanLine,
  School,
  ScrollText,
  Settings,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { P, type PermissionKey } from "./permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visible when the user holds ANY of these. Empty means every signed-in user. */
  perms: PermissionKey[];
  /** Hidden when the user holds this (keeps one entry per job, e.g. staff see QR Verification, admins see QR Credentials). */
  hideWhen?: PermissionKey;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perms: [] },
  { label: "School profile", href: "/school", icon: School, perms: [P.SCHOOL_VIEW] },
  { label: "Administrators and staff", href: "/staff", icon: Users, perms: [P.STAFF_MANAGE] },
  { label: "Students", href: "/students", icon: GraduationCap, perms: [P.STUDENTS_VIEW] },
  { label: "Student import", href: "/students/import", icon: Upload, perms: [P.STUDENTS_IMPORT] },
  { label: "Enrollment records", href: "/enrollments", icon: ClipboardList, perms: [P.ENROLLMENT_MANAGE, P.ENROLLMENT_MANAGE_LIMITED] },
  { label: "QR credentials", href: "/qr", icon: QrCode, perms: [P.QR_ISSUE] },
  { label: "QR verification", href: "/qr/verify", icon: ScanLine, perms: [P.QR_SCAN], hideWhen: P.QR_ISSUE },
  { label: "Audit activity", href: "/audit", icon: ScrollText, perms: [P.AUDIT_VIEW, P.AUDIT_VIEW_LIMITED] },
  { label: "My profile", href: "/me/profile", icon: UserRound, perms: [P.STUDENTS_VIEW_OWN] },
  { label: "My enrollment", href: "/me/enrollment", icon: ClipboardList, perms: [P.STUDENTS_VIEW_OWN] },
  { label: "My QR credential", href: "/me/qr", icon: IdCard, perms: [P.QR_VIEW_OWN] },
  { label: "Account settings", href: "/settings", icon: Settings, perms: [] },
];

/**
 * Route-level rules for direct navigation (DSH-03). Longest matching prefix wins.
 * The API enforces the same rules; this only keeps the UI honest.
 */
export const ROUTE_RULES: { prefix: string; perms: PermissionKey[] }[] = [
  { prefix: "/school", perms: [P.SCHOOL_VIEW] },
  { prefix: "/staff", perms: [P.STAFF_MANAGE] },
  { prefix: "/students/import", perms: [P.STUDENTS_IMPORT] },
  { prefix: "/students/new", perms: [P.STUDENTS_CREATE] },
  { prefix: "/students", perms: [P.STUDENTS_VIEW] },
  { prefix: "/enrollments", perms: [P.ENROLLMENT_MANAGE, P.ENROLLMENT_MANAGE_LIMITED] },
  { prefix: "/qr/verify", perms: [P.QR_SCAN] },
  { prefix: "/qr", perms: [P.QR_ISSUE] },
  { prefix: "/audit", perms: [P.AUDIT_VIEW, P.AUDIT_VIEW_LIMITED] },
  { prefix: "/me/qr", perms: [P.QR_VIEW_OWN] },
  { prefix: "/me", perms: [P.STUDENTS_VIEW_OWN] },
];

export function isRouteAllowed(pathname: string, permissions: string[]) {
  const rule = ROUTE_RULES.filter((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];
  if (!rule) return true;
  return rule.perms.some((p) => permissions.includes(p));
}

export function visibleNav(permissions: string[]) {
  return NAV_ITEMS.filter(
    (i) => (i.perms.length === 0 || i.perms.some((p) => permissions.includes(p))) && !(i.hideWhen && permissions.includes(i.hideWhen)),
  );
}
