"use client";

import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Pencil } from "lucide-react";
import * as yup from "yup";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/feedback";
import { GuardianFields, type GuardiansFormValues } from "@/components/forms/guardian-fields";
import { useStudentMutations } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { getErrorMessage } from "@/lib/api";
import { P } from "@/lib/permissions";
import { guardianSchema } from "@/validation/schemas";
import type { Student } from "@/types";

const schema = yup.object({
  guardians: yup
    .array()
    .of(guardianSchema)
    .required()
    .test("one-primary", "Only one guardian can be the primary contact", (l) => (l ?? []).filter((g) => g.isPrimary).length <= 1),
});

export function GuardiansTab({ student }: { student: Student }) {
  const can = useCan();
  const canManage = can(P.GUARDIANS_MANAGE, P.GUARDIANS_MANAGE_LIMITED);
  const [open, setOpen] = useState(false);
  const { setGuardians } = useStudentMutations(student.id);
  const form = useForm<GuardiansFormValues>({
    resolver: yupResolver(schema) as never,
    values: {
      guardians: student.guardians.map((g) => ({
        fullName: g.fullName,
        relationship: g.relationship,
        email: g.email ?? undefined,
        phone: g.phone ?? undefined,
        alternativePhone: g.alternativePhone ?? undefined,
        address: g.address ?? undefined,
        isPrimary: g.isPrimary,
        isEmergency: g.isEmergency,
      })),
    },
  });

  return (
    <Card>
      <CardHeader
        title="Guardian contacts"
        description="Contact details only. Guardians have no account and cannot sign in."
        action={
          canManage && (
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
          )
        }
      />
      {student.guardians.length === 0 ? (
        <EmptyState title="No guardian contacts" description="Add at least one contact so the school can reach the family." />
      ) : (
        <CardBody className="grid gap-4 md:grid-cols-2">
          {student.guardians.map((g) => (
            <div key={g.id} className="rounded-panel border border-line p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{g.fullName}</p>
                {g.isPrimary && <Badge tone="info">Primary</Badge>}
                {g.isEmergency && <Badge tone="warn">Emergency</Badge>}
              </div>
              <p className="text-sm text-muted">{g.relationship}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="w-16 text-muted">Phone</dt>
                  <dd>{g.phone ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 text-muted">Email</dt>
                  <dd className="break-all">{g.email ?? "-"}</dd>
                </div>
              </dl>
            </div>
          ))}
        </CardBody>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Edit guardian contacts" className="max-w-2xl">
          <form
            noValidate
            className="space-y-4"
            onSubmit={form.handleSubmit((v) =>
              setGuardians.mutate(v.guardians, {
                onSuccess: () => {
                  toast.success("Guardian contacts saved");
                  setOpen(false);
                },
                onError: (e) => toast.error(getErrorMessage(e)),
              }),
            )}
          >
            <GuardianFields form={form as UseFormReturn<GuardiansFormValues>} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={setGuardians.isPending}>
                Save contacts
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
