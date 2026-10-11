"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CredentialsDialog } from "@/components/credentials-dialog";
import { useStudentMutations } from "@/hooks/queries";
import { getErrorMessage } from "@/lib/api";
import type { Student } from "@/types";

export function AccountTab({ student }: { student: Student }) {
  const m = useStudentMutations(student.id);
  const [creds, setCreds] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [confirm, setConfirm] = useState<"reset" | "SUSPENDED" | "DEACTIVATED" | null>(null);
  const onError = (e: unknown) => toast.error(getErrorMessage(e));

  return (
    <Card>
      <CardHeader title="Student login" description="Students sign in to the same dashboard and see only their own record." />
      <CardBody>
        {!student.hasAccount ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">This student cannot sign in yet. Activating creates a username and a temporary password.</p>
            <Button loading={m.activateAccount.isPending} onClick={() => m.activateAccount.mutate(undefined, { onSuccess: setCreds, onError })}>
              Activate account
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">Username</dt>
                <dd className="mt-0.5 font-mono font-semibold">{student.username}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Account status</dt>
                <dd className="mt-1">{student.accountStatus && <StatusBadge status={student.accountStatus} />}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setConfirm("reset")}>
                Reset password
              </Button>
              {student.accountStatus === "ACTIVE" ? (
                <>
                  <Button variant="secondary" onClick={() => setConfirm("SUSPENDED")}>
                    Suspend
                  </Button>
                  <Button variant="dangerOutline" onClick={() => setConfirm("DEACTIVATED")}>
                    Deactivate
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  loading={m.setAccountStatus.isPending}
                  onClick={() => m.setAccountStatus.mutate("ACTIVE", { onSuccess: () => toast.success("Account reinstated"), onError })}
                >
                  Reinstate account
                </Button>
              )}
            </div>
          </div>
        )}
      </CardBody>

      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Reset this student's password?"
        description="The current password stops working immediately. You will see a new temporary password to share."
        confirmLabel="Reset password"
        loading={m.resetPassword.isPending}
        onConfirm={() =>
          m.resetPassword.mutate(undefined, {
            onSuccess: (c) => {
              setConfirm(null);
              setCreds(c);
            },
            onError,
          })
        }
      />
      <ConfirmDialog
        open={confirm === "SUSPENDED" || confirm === "DEACTIVATED"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "SUSPENDED" ? "Suspend this account?" : "Deactivate this account?"}
        description="The student is signed out and cannot use the dashboard. Their records stay available to the school."
        confirmLabel={confirm === "SUSPENDED" ? "Suspend" : "Deactivate"}
        danger
        loading={m.setAccountStatus.isPending}
        onConfirm={() =>
          confirm &&
          confirm !== "reset" &&
          m.setAccountStatus.mutate(confirm, {
            onSuccess: () => {
              toast.success("Account updated");
              setConfirm(null);
            },
            onError,
          })
        }
      />
      <CredentialsDialog credentials={creds} onClose={() => setCreds(null)} />
    </Card>
  );
}
