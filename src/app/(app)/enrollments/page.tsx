"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/feedback";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useEnrollments } from "@/hooks/queries";
import { formatDate, titleCase } from "@/lib/utils";
import { STUDENT_STATUSES } from "@/validation/schemas";

export default function EnrollmentsPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading, isError, refetch } = useEnrollments(status);

  return (
    <>
      <PageHeader title="Enrollment records" description="The latest enrollment for each student. Open a student to see the full history or change a status." />
      <Card>
        <div className="border-b border-line p-4">
          <Select aria-label="Filter by status" className="w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STUDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.length ? (
          <EmptyState title="No enrollment records" description="Records appear here as soon as students are added." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Admission number</Th>
                <Th>Enrolled</Th>
                <Th>Status</Th>
                <Th>Exit date</Th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ student, enrollment }) => (
                <Tr key={enrollment.id}>
                  <Td>
                    <Link href={`/students/${student.id}`} className="font-medium text-primary hover:underline">
                      {student.fullName}
                    </Link>
                  </Td>
                  <Td className="tabular-nums">{student.admissionNumber}</Td>
                  <Td>{formatDate(enrollment.enrollmentDate)}</Td>
                  <Td>
                    <StatusBadge status={enrollment.status} />
                  </Td>
                  <Td>{formatDate(enrollment.exitDate)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
