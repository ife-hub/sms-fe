"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState, Forbidden, Skeleton } from "@/components/ui/feedback";
import { ProfileTab } from "@/components/student/profile-tab";
import { EnrollmentTab } from "@/components/student/enrollment-tab";
import { GuardiansTab } from "@/components/student/guardians-tab";
import { AccountTab } from "@/components/student/account-tab";
import { QrTab } from "@/components/student/qr-tab";
import { useStudent } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { getStatus } from "@/lib/api";
import { P, type PermissionKey } from "@/lib/permissions";
import { cn, fullName } from "@/lib/utils";

type TabKey = "profile" | "enrollment" | "guardians" | "account" | "qr";

const TABS: { key: TabKey; label: string; perms: PermissionKey[] }[] = [
  { key: "profile", label: "Profile", perms: [] },
  { key: "enrollment", label: "Enrollment", perms: [] },
  { key: "guardians", label: "Guardians", perms: [] },
  { key: "account", label: "Login", perms: [P.STUDENT_ACCOUNT_MANAGE] },
  { key: "qr", label: "QR credential", perms: [P.QR_ISSUE] },
];

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const can = useCan();
  const [tab, setTab] = useState<TabKey>("profile");
  const { data: student, isLoading, isError, error, refetch } = useStudent(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  // A missing record and a record you may not see look the same on purpose.
  if (getStatus(error) === 404 || getStatus(error) === 403) return <Forbidden />;
  if (isError || !student) {
    return (
      <Card>
        <ErrorState onRetry={() => refetch()} />
      </Card>
    );
  }

  const tabs = TABS.filter((t) => t.perms.length === 0 || can(...t.perms));

  return (
    <>
      <Link href="/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All students
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">{fullName(student)}</h1>
        <StatusBadge status={student.status} />
        <span className="text-sm tabular-nums text-muted">{student.admissionNumber}</span>
      </div>

      <div role="tablist" aria-label="Student sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "profile" && <ProfileTab student={student} />}
        {tab === "enrollment" && <EnrollmentTab student={student} />}
        {tab === "guardians" && <GuardiansTab student={student} />}
        {tab === "account" && <AccountTab student={student} />}
        {tab === "qr" && <QrTab student={student} />}
      </div>
    </>
  );
}
