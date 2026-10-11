"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation } from "@tanstack/react-query";
import { Camera, CameraOff, ShieldCheck, ShieldX } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { studentsService } from "@/services/students";
import { getErrorMessage } from "@/lib/api";
import { initials } from "@/lib/utils";
import { qrScanSchema, type QrScanValues } from "@/validation/schemas";

const READER_ID = "qr-reader";

export default function QrVerifyPage() {
  const scanner = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scan = useMutation({ mutationFn: studentsService.scan });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QrScanValues>({ resolver: yupResolver(qrScanSchema) });

  const stopCamera = useCallback(async () => {
    const s = scanner.current;
    scanner.current = null;
    if (s) {
      try {
        if (s.isScanning) await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
    }
    setCameraOn(false);
  }, []);

  useEffect(() => () => void stopCamera(), [stopCamera]);

  async function startCamera() {
    setCameraError(null);
    scan.reset();
    setCameraOn(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      // wait a tick so the reader container is in the DOM
      await new Promise((r) => setTimeout(r, 50));
      const instance = new Html5Qrcode(READER_ID);
      scanner.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          void stopCamera();
          scan.mutate(decoded);
        },
        () => undefined,
      );
    } catch {
      setCameraError("We could not open the camera. Allow camera access in your browser, or paste the credential below.");
      void stopCamera();
    }
  }

  const result = scan.data;

  return (
    <>
      <PageHeader title="QR verification" description="Scan a student ID card to confirm who they are. Only limited identity details are shown." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Scan with camera" />
            <CardBody className="space-y-4">
              {cameraOn ? (
                <>
                  <div id={READER_ID} className="overflow-hidden rounded-panel bg-board" />
                  <Button variant="secondary" onClick={() => void stopCamera()}>
                    <CameraOff className="h-4 w-4" aria-hidden />
                    Stop camera
                  </Button>
                </>
              ) : (
                <Button onClick={startCamera}>
                  <Camera className="h-4 w-4" aria-hidden />
                  Start camera
                </Button>
              )}
              {cameraError && (
                <p role="alert" className="rounded-field bg-warn-soft px-3 py-2 text-sm text-warn">
                  {cameraError}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Enter the code instead" description="Paste the credential text from a code reader." />
            <CardBody>
              <form
                noValidate
                className="space-y-4"
                onSubmit={handleSubmit((v) => {
                  scan.mutate(v.token);
                })}
              >
                <Field label="Credential" htmlFor="token" error={errors.token?.message}>
                  <Input id="token" autoComplete="off" spellCheck={false} aria-invalid={!!errors.token} {...register("token")} />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" loading={scan.isPending}>
                    Verify
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      reset();
                      scan.reset();
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div aria-live="polite">
          {scan.isPending && <p className="text-sm text-muted">Checking the code...</p>}
          {scan.isError && (
            <Card className="border-danger/40">
              <CardBody className="flex items-start gap-3">
                <ShieldX className="h-8 w-8 shrink-0 text-danger" aria-hidden />
                <div>
                  <p className="font-display text-lg font-semibold text-danger">Not verified</p>
                  <p className="text-sm text-muted">{getErrorMessage(scan.error, "This code is not valid.")} It may be revoked, replaced or from another school.</p>
                </div>
              </CardBody>
            </Card>
          )}
          {result && (
            <Card className="border-success/40">
              <CardBody>
                <div className="mb-4 flex items-center gap-2 text-success">
                  <ShieldCheck className="h-6 w-6" aria-hidden />
                  <p className="font-display text-lg font-semibold">Verified</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="grid h-20 w-20 shrink-0 place-items-center rounded-panel bg-board font-display text-2xl font-semibold text-white" aria-hidden>
                    {initials(result.fullName.split(" ")[0], result.fullName.split(" ").at(-1) ?? "")}
                  </span>
                  <div>
                    <p className="text-xl font-semibold">{result.fullName}</p>
                    <p className="tabular-nums text-muted">{result.admissionNumber}</p>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted">School</dt>
                    <dd className="font-medium">{result.schoolName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Enrollment</dt>
                    <dd className="mt-0.5">
                      <StatusBadge status={result.enrollmentStatus} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">QR status</dt>
                    <dd className="mt-0.5">
                      <StatusBadge status={result.qrStatus} />
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          )}
          {!scan.isPending && !scan.isError && !result && (
            <Card>
              <CardBody className="py-12 text-center text-sm text-muted">The result appears here after a scan.</CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
