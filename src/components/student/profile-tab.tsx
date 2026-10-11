"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStudentMutations } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { getErrorMessage } from "@/lib/api";
import { P } from "@/lib/permissions";
import { formatDate, titleCase } from "@/lib/utils";
import { GENDERS, studentSchema } from "@/validation/schemas";
import * as yup from "yup";
import type { Student } from "@/types";

const profileSchema = studentSchema.pick(["firstName", "middleName", "lastName", "dateOfBirth", "gender", "email", "phone", "address"]);
type ProfileValues = yup.InferType<typeof profileSchema>;

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "-"}</dd>
    </div>
  );
}

export function ProfileTab({ student }: { student: Student }) {
  const can = useCan();
  const fullEdit = can(P.STUDENTS_UPDATE);
  const canEdit = fullEdit || can(P.STUDENTS_UPDATE_LIMITED);
  const [open, setOpen] = useState(false);
  const { update } = useStudentMutations(student.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: yupResolver(profileSchema),
    values: {
      firstName: student.firstName,
      middleName: student.middleName ?? undefined,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      email: student.email ?? undefined,
      phone: student.phone ?? undefined,
      address: student.address ?? undefined,
    },
  });

  return (
    <Card>
      <CardHeader
        title="Profile"
        action={
          canEdit && (
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
          )
        }
      />
      <CardBody>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Row label="Admission number" value={student.admissionNumber} />
          <Row label="Gender" value={titleCase(student.gender)} />
          <Row label="First name" value={student.firstName} />
          <Row label="Middle name" value={student.middleName} />
          <Row label="Last name" value={student.lastName} />
          <Row label="Date of birth" value={formatDate(student.dateOfBirth)} />
          <Row label="Email" value={student.email} />
          <Row label="Phone" value={student.phone} />
          <div className="sm:col-span-2">
            <Row label="Address" value={student.address} />
          </div>
        </dl>
      </CardBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Edit profile"
          description={fullEdit ? undefined : "Your role can update contact details only."}
        >
          <form
            noValidate
            className="space-y-4"
            onSubmit={handleSubmit((v) =>
              update.mutate(v as Partial<Student>, {
                onSuccess: () => {
                  toast.success("Profile saved");
                  setOpen(false);
                },
                onError: (e) => toast.error(getErrorMessage(e)),
              }),
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="p-first" error={errors.firstName?.message} required>
                <Input id="p-first" disabled={!fullEdit} {...register("firstName")} />
              </Field>
              <Field label="Last name" htmlFor="p-last" error={errors.lastName?.message} required>
                <Input id="p-last" disabled={!fullEdit} {...register("lastName")} />
              </Field>
              <Field label="Middle name" htmlFor="p-middle">
                <Input id="p-middle" disabled={!fullEdit} {...register("middleName")} />
              </Field>
              <Field label="Date of birth" htmlFor="p-dob" error={errors.dateOfBirth?.message} required>
                <Input id="p-dob" type="date" disabled={!fullEdit} {...register("dateOfBirth")} />
              </Field>
              <Field label="Gender" htmlFor="p-gender" error={errors.gender?.message} required>
                <Select id="p-gender" disabled={!fullEdit} {...register("gender")}>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {titleCase(g)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Phone" htmlFor="p-phone" error={errors.phone?.message}>
                <Input id="p-phone" {...register("phone")} />
              </Field>
              <Field label="Email" htmlFor="p-email" error={errors.email?.message} className="sm:col-span-2">
                <Input id="p-email" type="email" {...register("email")} />
              </Field>
              <Field label="Address" htmlFor="p-address" className="sm:col-span-2">
                <Textarea id="p-address" {...register("address")} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={update.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
