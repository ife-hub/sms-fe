"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton, ErrorState } from "@/components/ui/feedback";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useSummary } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { useAuthStore } from "@/stores/auth-store";
import { P } from "@/lib/permissions";

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 font-display text-4xl font-semibold tabular-nums">{value}</p>
        {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)!;
  const can = useCan();
  const { data, isLoading, isError, refetch } = useSummary();
  const isStudent = user.role === "STUDENT";

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">Hello, {user.firstName}</h1>
        <p className="mt-1 text-muted">
          {isStudent ? `Your details at ${user.schoolName}.` : `Here is where ${user.schoolName} stands today.`}
        </p>
      </div>

      {isStudent ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { href: "/me/profile", title: "My profile", text: "Your official details and school information." },
            { href: "/me/enrollment", title: "My enrollment", text: "Your admission number and enrollment status." },
            { href: "/me/qr", title: "My QR credential", text: "The code on your school ID card." },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="rounded-panel border border-line bg-surface p-5 hover:border-primary">
              <p className="font-display text-lg font-semibold">{c.title}</p>
              <p className="mt-1 text-sm text-muted">{c.text}</p>
            </Link>
          ))}
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.students && (
              <>
                <Stat label="Students" value={data.students.total} />
                <Stat label="Active students" value={data.students.active} note={`${data.students.pending} waiting for approval`} />
                <Stat label="Without a login" value={data.students.withoutAccount} note="Accounts not activated yet" />
              </>
            )}
            {data.qr && <Stat label="Active QR cards" value={data.qr.active} note={`${data.qr.revoked} revoked so far`} />}
            {data.staff && <Stat label="Staff accounts" value={data.staff.total} note={`${data.staff.invited} invited, not yet signed in`} />}
          </div>

          {data.recentStudents && (
            <Card>
              <CardHeader
                title="Recently added students"
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/students">
                      View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                }
              />
              <Table>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Admission number</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentStudents.map((s) => (
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
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          {can(P.STUDENTS_CREATE) && (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/students/new">Add a student</Link>
              </Button>
              {can(P.STUDENTS_IMPORT) && (
                <Button asChild variant="secondary">
                  <Link href="/students/import">Import students</Link>
                </Button>
              )}
              {can(P.QR_SCAN) && (
                <Button asChild variant="secondary">
                  <Link href="/qr/verify">Verify a QR code</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
