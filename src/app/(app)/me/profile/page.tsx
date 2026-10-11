"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useMyStudent } from "@/hooks/queries";
import { useAuthStore } from "@/stores/auth-store";
import { formatDate, titleCase } from "@/lib/utils";

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "-"}</dd>
    </div>
  );
}

export default function MyProfilePage() {
  const schoolName = useAuthStore((s) => s.user?.schoolName);
  const { data: s, isLoading, isError, refetch } = useMyStudent();
  return (
    <>
      <PageHeader title="My profile" description="Your official details. Ask the school office if anything needs correcting." />
      <Card className="max-w-2xl">
        <CardHeader title="Personal details" />
        <CardBody>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : isError || !s ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <dl className="grid gap-5 sm:grid-cols-2">
              <Row label="First name" value={s.firstName} />
              <Row label="Middle name" value={s.middleName} />
              <Row label="Last name" value={s.lastName} />
              <Row label="Gender" value={titleCase(s.gender)} />
              <Row label="Date of birth" value={formatDate(s.dateOfBirth)} />
              <Row label="Admission number" value={s.admissionNumber} />
              <Row label="School" value={schoolName} />
              <Row label="Status" value={<StatusBadge status={s.status} />} />
            </dl>
          )}
        </CardBody>
      </Card>
    </>
  );
}
