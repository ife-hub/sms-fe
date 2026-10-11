"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog, DialogContent, ConfirmDialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/feedback";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useStaff, useStaffMutations } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { getErrorMessage } from "@/lib/api";
import { P, ROLE_LABELS } from "@/lib/permissions";
import { fullName, formatDate } from "@/lib/utils";
import { schoolUserSchema, type SchoolUserValues } from "@/validation/schemas";
import type { SchoolUser } from "@/types";

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const can = useCan();
  const { invite } = useStaffMutations();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SchoolUserValues>({ resolver: yupResolver(schoolUserSchema), defaultValues: { role: "STAFF" } });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent title="Invite a school user" description="They receive a time-limited invitation to set their own password.">
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            invite.mutate(v, {
              onSuccess: () => {
                toast.success(`Invitation sent to ${v.email}`);
                reset();
                onOpenChange(false);
              },
              onError: (e) => setError("email", { message: getErrorMessage(e) }),
            }),
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName" error={errors.firstName?.message} required>
              <Input id="firstName" aria-invalid={!!errors.firstName} {...register("firstName")} />
            </Field>
            <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message} required>
              <Input id="lastName" aria-invalid={!!errors.lastName} {...register("lastName")} />
            </Field>
          </div>
          <Field label="Middle name" htmlFor="middleName" error={errors.middleName?.message}>
            <Input id="middleName" {...register("middleName")} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" {...register("phone")} />
            </Field>
            <Field label="Staff number" htmlFor="staffNumber" error={errors.staffNumber?.message}>
              <Input id="staffNumber" {...register("staffNumber")} />
            </Field>
          </div>
          <Field label="Role" htmlFor="role" error={errors.role?.message} required>
            <Select id="role" {...register("role")}>
              <option value="STAFF">Staff</option>
              {can(P.ADMINS_MANAGE) && <option value="ADMIN">Administrator</option>}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={invite.isPending}>
              Send invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StaffPage() {
  const can = useCan();
  const { data, isLoading, isError, refetch } = useStaff();
  const { setStatus, setRole } = useStaffMutations();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, setPending] = useState<{ user: SchoolUser; status: "SUSPENDED" | "DEACTIVATED" } | null>(null);

  const canAdmins = can(P.ADMINS_MANAGE);

  function change(user: SchoolUser, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") {
    setStatus.mutate(
      { id: user.id, status },
      {
        onSuccess: () => {
          toast.success(`${fullName(user)} is now ${status.toLowerCase()}`);
          setPending(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <>
      <PageHeader
        title={canAdmins ? "Administrators and staff" : "Staff"}
        description="Invite people, change what they can do, and stop access when someone leaves."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Invite someone
          </Button>
        }
      />
      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.length ? (
          <EmptyState title="No staff yet" description="Invite your first staff member to share the work of onboarding students." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Staff number</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => {
                const protectedRow = u.role === "SUPER_ADMIN";
                const editable = !protectedRow && (u.role === "STAFF" || canAdmins);
                return (
                  <Tr key={u.id}>
                    <Td>
                      <p className="font-medium">{fullName(u)}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </Td>
                    <Td>
                      {canAdmins && editable ? (
                        <Select
                          aria-label={`Role for ${fullName(u)}`}
                          className="h-8 w-40 text-xs"
                          value={u.role}
                          onChange={(e) =>
                            setRole.mutate(
                              { id: u.id, role: e.target.value as "ADMIN" | "STAFF" },
                              { onSuccess: () => toast.success("Role updated"), onError: (er) => toast.error(getErrorMessage(er)) },
                            )
                          }
                        >
                          <option value="STAFF">Staff</option>
                          <option value="ADMIN">Administrator</option>
                        </Select>
                      ) : (
                        ROLE_LABELS[u.role]
                      )}
                    </Td>
                    <Td className="tabular-nums">{u.staffNumber ?? "-"}</Td>
                    <Td>
                      <StatusBadge status={u.status} />
                    </Td>
                    <Td>{formatDate(u.joinedAt)}</Td>
                    <Td className="text-right">
                      {editable ? (
                        <div className="flex justify-end gap-1">
                          {u.status === "ACTIVE" ? (
                            <Button size="sm" variant="secondary" onClick={() => setPending({ user: u, status: "SUSPENDED" })}>
                              Suspend
                            </Button>
                          ) : u.status !== "DEACTIVATED" ? (
                            <Button size="sm" variant="secondary" onClick={() => change(u, "ACTIVE")}>
                              {u.status === "INVITED" ? "Activate" : "Reinstate"}
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => change(u, "ACTIVE")}>
                              Reactivate
                            </Button>
                          )}
                          {u.status !== "DEACTIVATED" && (
                            <Button size="sm" variant="dangerOutline" onClick={() => setPending({ user: u, status: "DEACTIVATED" })}>
                              Deactivate
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">{protectedRow ? "Protected" : "-"}</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.status === "SUSPENDED" ? "Suspend this user?" : "Deactivate this user?"}
        description={`${pending ? fullName(pending.user) : ""} will be signed out and cannot sign in again until you restore access. Their history stays in the audit trail.`}
        confirmLabel={pending?.status === "SUSPENDED" ? "Suspend" : "Deactivate"}
        danger
        loading={setStatus.isPending}
        onConfirm={() => pending && change(pending.user, pending.status)}
      />
    </>
  );
}
