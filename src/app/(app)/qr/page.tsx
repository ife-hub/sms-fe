"use client";

import Link from "next/link";
import { ScanLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/feedback";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useQrOverview } from "@/hooks/queries";
import { formatDateTime } from "@/lib/utils";

export default function QrCredentialsPage() {
  const { data, isLoading, isError, refetch } = useQrOverview();
  return (
    <>
      <PageHeader
        title="QR credentials"
        description="Which students hold an active ID card code. Issue, replace or revoke from the student's page."
        actions={
          <Button asChild variant="secondary">
            <Link href="/qr/verify">
              <ScanLine className="h-4 w-4" aria-hidden />
              Verify a code
            </Link>
          </Button>
        }
      />
      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.length ? (
          <EmptyState title="No students yet" description="Add students before issuing QR credentials." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Admission number</Th>
                <Th>Card</Th>
                <Th>Last issued</Th>
                <Th>Cards issued</Th>
                <Th className="text-right">Manage</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <Tr key={r.student.id}>
                  <Td className="font-medium">{r.student.fullName}</Td>
                  <Td className="tabular-nums">{r.student.admissionNumber}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td>{formatDateTime(r.issuedAt)}</Td>
                  <Td className="tabular-nums">{r.credentialCount}</Td>
                  <Td className="text-right">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/students/${r.student.id}`}>Open student</Link>
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
