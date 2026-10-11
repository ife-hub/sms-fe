"use client";

import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { QrCardPreview } from "@/components/qr-card";
import { StatusBadge } from "@/components/ui/badge";
import { useMyQr, useMyStudent } from "@/hooks/queries";
import { useAuthStore } from "@/stores/auth-store";
import { fullName } from "@/lib/utils";

export default function MyQrPage() {
  const schoolName = useAuthStore((s) => s.user?.schoolName ?? "");
  const student = useMyStudent();
  const qr = useMyQr();

  return (
    <>
      <PageHeader title="My QR credential" description="Show this code to school staff when they ask to check your ID." />
      <Card className="max-w-md">
        <CardBody>
          {qr.isLoading || student.isLoading ? (
            <Skeleton className="mx-auto h-72 w-64" />
          ) : qr.isError || student.isError ? (
            <ErrorState onRetry={() => qr.refetch()} />
          ) : !qr.data || !qr.data.token || !student.data ? (
            <EmptyState title="No QR code yet" description="The school office issues your code. Ask them if you need one." />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <StatusBadge status={qr.data.status} />
              </div>
              <QrCardPreview token={qr.data.token} name={fullName(student.data)} admissionNumber={student.data.admissionNumber} schoolName={schoolName} />
              <p className="text-center text-xs text-muted">The code holds no personal details. If you lose your card, tell the school so it can be replaced.</p>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
