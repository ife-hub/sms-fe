"use client";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/feedback";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useAudit } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { P } from "@/lib/permissions";
import { formatDateTime, titleCase } from "@/lib/utils";

export default function AuditPage() {
  const can = useCan();
  const { data, isLoading, isError, refetch } = useAudit();
  return (
    <>
      <PageHeader
        title="Audit activity"
        description={can(P.AUDIT_VIEW) ? "Security and administrative events across the school." : "Student and QR events you are allowed to see."}
      />
      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.length ? (
          <EmptyState title="Nothing recorded yet" description="Sign-ins, role changes, QR scans and student edits appear here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Area</Th>
                <Th>Event</Th>
                <Th>By</Th>
                <Th>About</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <Tr key={e.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(e.occurredAt)}</Td>
                  <Td>{titleCase(e.category)}</Td>
                  <Td>{e.action}</Td>
                  <Td>{e.actor}</Td>
                  <Td>{e.target ?? "-"}</Td>
                  <Td>
                    <StatusBadge status={e.result} />
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
