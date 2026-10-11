"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { QrCardPreview } from "@/components/qr-card";
import { useStudentMutations } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { getErrorMessage } from "@/lib/api";
import { P } from "@/lib/permissions";
import { formatDateTime, fullName } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Student } from "@/types";

export function QrTab({ student }: { student: Student }) {
  const can = useCan();
  const schoolName = useAuthStore((s) => s.user?.schoolName ?? "");
  const m = useStudentMutations(student.id);
  const [issued, setIssued] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"reissue" | "revoke" | null>(null);
  const active = student.qrCredentials.find((c) => c.status === "ACTIVE");
  const onError = (e: unknown) => toast.error(getErrorMessage(e));

  function issue() {
    m.issueQr.mutate(undefined, {
      onSuccess: (c) => {
        setConfirm(null);
        setIssued(c.token ?? null);
      },
      onError,
    });
  }

  return (
    <Card>
      <CardHeader title="QR credential" description="A student has one active QR code at a time. The code holds no personal information." />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted">Current card</p>
            <StatusBadge status={active ? "ACTIVE" : "NONE"} />
          </div>
          {can(P.QR_ISSUE) && (
            <div className="flex gap-2">
              {active ? (
                <>
                  <Button variant="secondary" onClick={() => setConfirm("reissue")}>
                    Replace card
                  </Button>
                  {can(P.QR_REVOKE) && (
                    <Button variant="dangerOutline" onClick={() => setConfirm("revoke")}>
                      Revoke
                    </Button>
                  )}
                </>
              ) : (
                <Button loading={m.issueQr.isPending} onClick={issue}>
                  Issue QR credential
                </Button>
              )}
            </div>
          )}
        </div>
        {active && (
          <p className="rounded-field bg-paper px-3 py-2 text-sm text-muted">
            For security the code is shown only when it is issued. To print another copy, replace the card; the old code stops working straight away.
          </p>
        )}

        {student.qrCredentials.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Issued</Th>
                <Th>Status</Th>
                <Th>Revoked</Th>
              </tr>
            </thead>
            <tbody>
              {student.qrCredentials.map((c) => (
                <Tr key={c.id}>
                  <Td>{formatDateTime(c.createdAt)}</Td>
                  <Td>
                    <StatusBadge status={c.status} />
                  </Td>
                  <Td>{formatDateTime(c.revokedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>

      <ConfirmDialog
        open={confirm === "reissue"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Replace this student's QR card?"
        description="The current card stops working immediately. You will be able to print the new one."
        confirmLabel="Replace card"
        loading={m.issueQr.isPending}
        onConfirm={issue}
      />
      <ConfirmDialog
        open={confirm === "revoke"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Revoke this QR card?"
        description="Scans of the current card will be rejected straight away. You can issue a new one later."
        confirmLabel="Revoke card"
        danger
        loading={m.revokeQr.isPending}
        onConfirm={() =>
          m.revokeQr.mutate(undefined, {
            onSuccess: () => {
              toast.success("QR credential revoked");
              setConfirm(null);
            },
            onError,
          })
        }
      />
      <Dialog open={!!issued} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent title="New QR card" description="Print or download it now. It will not be shown again.">
          {issued && <QrCardPreview token={issued} name={fullName(student)} admissionNumber={student.admissionNumber} schoolName={schoolName} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
