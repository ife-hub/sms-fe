"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useStudentMutations } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { getErrorMessage } from "@/lib/api";
import { P } from "@/lib/permissions";
import { formatDate, titleCase } from "@/lib/utils";
import { STUDENT_STATUSES, enrollmentUpdateSchema, type EnrollmentUpdateValues } from "@/validation/schemas";
import type { Student } from "@/types";

export function EnrollmentTab({ student }: { student: Student }) {
  const can = useCan();
  const canManage = can(P.ENROLLMENT_MANAGE, P.ENROLLMENT_MANAGE_LIMITED);
  const [open, setOpen] = useState(false);
  const { changeEnrollment } = useStudentMutations(student.id);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EnrollmentUpdateValues>({
    resolver: yupResolver(enrollmentUpdateSchema),
    defaultValues: { status: student.status, enrollmentDate: new Date().toISOString().slice(0, 10) },
  });
  const status = watch("status");
  const exiting = status === "WITHDRAWN" || status === "GRADUATED";

  return (
    <Card>
      <CardHeader
        title="Enrollment history"
        description="Every status change is kept as its own record."
        action={canManage && <Button size="sm" onClick={() => setOpen(true)}>Change status</Button>}
      />
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Status</Th>
            <Th>Exit date</Th>
            <Th>Exit reason</Th>
          </tr>
        </thead>
        <tbody>
          {student.enrollments.map((e) => (
            <Tr key={e.id}>
              <Td>{formatDate(e.enrollmentDate)}</Td>
              <Td>
                <StatusBadge status={e.status} />
              </Td>
              <Td>{formatDate(e.exitDate)}</Td>
              <Td>{e.exitReason ?? "-"}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Change enrollment status" description="This adds a new record. Earlier records stay in the history.">
          <form
            noValidate
            className="space-y-4"
            onSubmit={handleSubmit((v) =>
              changeEnrollment.mutate(v, {
                onSuccess: () => {
                  toast.success("Enrollment updated");
                  setOpen(false);
                },
                onError: (e) => toast.error(getErrorMessage(e)),
              }),
            )}
          >
            <Field label="New status" htmlFor="en-status" error={errors.status?.message} required>
              <Select id="en-status" {...register("status")}>
                {STUDENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Effective date" htmlFor="en-date" error={errors.enrollmentDate?.message} required>
              <Input id="en-date" type="date" {...register("enrollmentDate")} />
            </Field>
            {exiting && (
              <>
                <Field label="Exit date" htmlFor="en-exit" error={errors.exitDate?.message} required>
                  <Input id="en-exit" type="date" aria-invalid={!!errors.exitDate} {...register("exitDate")} />
                </Field>
                <Field label="Exit reason" htmlFor="en-reason">
                  <Textarea id="en-reason" {...register("exitReason")} />
                </Field>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={changeEnrollment.isPending}>
                Save status
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
