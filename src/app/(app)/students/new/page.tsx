"use client";

import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { GuardianFields, emptyGuardian, type GuardiansFormValues } from "@/components/forms/guardian-fields";
import { useCreateStudent } from "@/hooks/queries";
import { getErrorMessage, getStatus } from "@/lib/api";
import { titleCase } from "@/lib/utils";
import { GENDERS, STUDENT_STATUSES, studentSchema, type StudentValues } from "@/validation/schemas";

export default function NewStudentPage() {
  const router = useRouter();
  const create = useCreateStudent();
  const form = useForm<StudentValues>({
    resolver: yupResolver(studentSchema),
    defaultValues: {
      status: "PENDING",
      enrollmentDate: new Date().toISOString().slice(0, 10),
      guardians: [emptyGuardian(true)],
    },
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  return (
    <>
      <PageHeader title="Add a student" description="The student and their first enrollment record are created together." />
      <form
        noValidate
        className="max-w-3xl space-y-6"
        onSubmit={handleSubmit((v) =>
          create.mutate(v, {
            onSuccess: (s) => {
              toast.success(`${s.firstName} ${s.lastName} added`);
              router.push(`/students/${s.id}`);
            },
            onError: (e) => {
              if (getStatus(e) === 409) setError("admissionNumber", { message: getErrorMessage(e) });
              else toast.error(getErrorMessage(e));
            },
          }),
        )}
      >
        <Card>
          <CardHeader title="Identity" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Admission number" htmlFor="admissionNumber" error={errors.admissionNumber?.message} required>
              <Input id="admissionNumber" aria-invalid={!!errors.admissionNumber} {...register("admissionNumber")} />
            </Field>
            <Field label="Gender" htmlFor="gender" error={errors.gender?.message} required>
              <Select id="gender" aria-invalid={!!errors.gender} {...register("gender")}>
                <option value="">Choose</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {titleCase(g)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="First name" htmlFor="firstName" error={errors.firstName?.message} required>
              <Input id="firstName" aria-invalid={!!errors.firstName} {...register("firstName")} />
            </Field>
            <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message} required>
              <Input id="lastName" aria-invalid={!!errors.lastName} {...register("lastName")} />
            </Field>
            <Field label="Middle name" htmlFor="middleName" error={errors.middleName?.message}>
              <Input id="middleName" {...register("middleName")} />
            </Field>
            <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message} required>
              <Input id="dateOfBirth" type="date" aria-invalid={!!errors.dateOfBirth} {...register("dateOfBirth")} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contact" description="Optional. A student does not need an email to sign in." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
            </Field>
            <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" aria-invalid={!!errors.phone} {...register("phone")} />
            </Field>
            <Field label="Address" htmlFor="address" error={errors.address?.message} className="sm:col-span-2">
              <Textarea id="address" {...register("address")} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Enrollment" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Enrollment date" htmlFor="enrollmentDate" error={errors.enrollmentDate?.message} required>
              <Input id="enrollmentDate" type="date" aria-invalid={!!errors.enrollmentDate} {...register("enrollmentDate")} />
            </Field>
            <Field label="Status" htmlFor="status" error={errors.status?.message} required>
              <Select id="status" {...register("status")}>
                {STUDENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Guardian contacts" description="Contact details only. Guardians do not get an account." />
          <CardBody>
            <GuardianFields form={form as unknown as UseFormReturn<GuardiansFormValues>} />
          </CardBody>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" loading={create.isPending}>
            Save student
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
