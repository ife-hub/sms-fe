"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useStudents } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { P } from "@/lib/permissions";
import { STUDENT_STATUSES } from "@/validation/schemas";
import { titleCase } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function StudentsPage() {
  const can = useCan();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, isFetching, refetch } = useStudents({ search: debounced, status, page, pageSize: PAGE_SIZE });

  return (
    <>
      <PageHeader
        title="Students"
        description="Everyone enrolled at your school, with their login and ID card status."
        actions={
          <>
            {can(P.STUDENTS_IMPORT) && (
              <Button asChild variant="secondary">
                <Link href="/students/import">
                  <Upload className="h-4 w-4" aria-hidden />
                  Import
                </Link>
              </Button>
            )}
            {can(P.STUDENTS_CREATE) && (
              <Button asChild>
                <Link href="/students/new">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add student
                </Link>
              </Button>
            )}
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              className="pl-9"
              placeholder="Search by name or admission number"
              aria-label="Search students"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            aria-label="Filter by status"
            className="w-44"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
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
        ) : !data?.items.length ? (
          <EmptyState
            title={debounced || status ? "No students match" : "No students yet"}
            description={debounced || status ? "Try a different name or clear the filters." : "Add your first student or import a class list."}
            action={
              !debounced && !status && can(P.STUDENTS_CREATE) ? (
                <Button asChild>
                  <Link href="/students/new">Add student</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={isFetching ? "opacity-70 transition-opacity" : undefined}>
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Admission number</Th>
                  <Th>Status</Th>
                  <Th>Login</Th>
                  <Th>QR card</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <Link href={`/students/${s.id}`} className="font-medium text-primary hover:underline">
                        {s.fullName}
                      </Link>
                    </Td>
                    <Td className="tabular-nums">{s.admissionNumber}</Td>
                    <Td>
                      <StatusBadge status={s.status} />
                    </Td>
                    <Td>{s.hasAccount ? <Badge tone="success">Active</Badge> : <Badge>None</Badge>}</Td>
                    <Td>{s.hasActiveQr ? <Badge tone="success">Issued</Badge> : <Badge>None</Badge>}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </>
  );
}
