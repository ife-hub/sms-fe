"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useMyStudent } from "@/hooks/queries";
import { formatDate } from "@/lib/utils";

export default function MyEnrollmentPage() {
  const { data: s, isLoading, isError, refetch } = useMyStudent();
  const current = s?.enrollments[0];
  return (
    <>
      <PageHeader title="My enrollment" description="Where you stand with the school right now." />
      <Card className="max-w-2xl">
        <CardHeader title="Current enrollment" />
        <CardBody>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : isError || !s || !current ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted">Admission number</dt>
                <dd className="mt-0.5 font-display text-xl font-semibold tabular-nums">{s.admissionNumber}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={current.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Enrolled on</dt>
                <dd className="mt-0.5 font-medium">{formatDate(current.enrollmentDate)}</dd>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>
    </>
  );
}
