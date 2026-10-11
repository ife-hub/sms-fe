"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { StatusBadge } from "@/components/ui/badge";
import { useSchool, useUpdateSchool } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { getErrorMessage } from "@/lib/api";
import { P } from "@/lib/permissions";
import { schoolSchema, type SchoolValues } from "@/validation/schemas";

export default function SchoolPage() {
  const can = useCan();
  const editable = can(P.SCHOOL_UPDATE);
  const { data, isLoading, isError, refetch } = useSchool();
  const update = useUpdateSchool();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SchoolValues>({ resolver: yupResolver(schoolSchema) });

  useEffect(() => {
    if (data) reset({ name: data.name, email: data.email, phone: data.phone, address: data.address });
  }, [data, reset]);

  return (
    <>
      <PageHeader
        title="School profile"
        description={editable ? "Keep your school's contact details accurate." : "Only the Super administrator can change these details."}
      />
      <Card className="max-w-2xl">
        <CardHeader title="School details" action={data && <StatusBadge status={data.status} />} />
        <CardBody>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : isError || !data ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <form
              noValidate
              className="space-y-4"
              onSubmit={handleSubmit((v) =>
                update.mutate(v, {
                  onSuccess: () => toast.success("School profile saved"),
                  onError: (e) => toast.error(getErrorMessage(e)),
                }),
              )}
            >
              <Field label="School code" hint="Set at setup. It cannot be changed here.">
                <Input value={data.code} disabled readOnly />
              </Field>
              <Field label="School name" htmlFor="name" error={errors.name?.message} required>
                <Input id="name" disabled={!editable} aria-invalid={!!errors.name} {...register("name")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact email" htmlFor="email" error={errors.email?.message} required>
                  <Input id="email" type="email" disabled={!editable} aria-invalid={!!errors.email} {...register("email")} />
                </Field>
                <Field label="Phone number" htmlFor="phone" error={errors.phone?.message} required>
                  <Input id="phone" disabled={!editable} aria-invalid={!!errors.phone} {...register("phone")} />
                </Field>
              </div>
              <Field label="Address" htmlFor="address" error={errors.address?.message} required>
                <Textarea id="address" disabled={!editable} aria-invalid={!!errors.address} {...register("address")} />
              </Field>
              {editable && (
                <Button type="submit" loading={update.isPending} disabled={!isDirty}>
                  Save changes
                </Button>
              )}
            </form>
          )}
        </CardBody>
      </Card>
    </>
  );
}
