"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Renders the opaque credential as a QR image. The code itself carries no personal data. */
export function QrCardPreview({
  token,
  name,
  admissionNumber,
  schoolName,
}: {
  token: string;
  name: string;
  admissionNumber: string;
  schoolName: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  function download() {
    const url = ref.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${admissionNumber}.png`;
    a.click();
  }

  return (
    <div>
      <div className="mx-auto w-64 rounded-panel border border-line bg-white p-5 text-center print:border-0">
        <p className="font-display text-sm font-semibold text-board">{schoolName}</p>
        <div className="my-3 flex justify-center">
          <QRCodeCanvas ref={ref} value={token} size={176} level="M" marginSize={1} />
        </div>
        <p className="font-medium">{name}</p>
        <p className="text-xs tabular-nums text-muted">{admissionNumber}</p>
      </div>
      <div className="no-print mt-4 flex justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={download}>
          <Download className="h-4 w-4" aria-hidden />
          Download image
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden />
          Print
        </Button>
      </div>
    </div>
  );
}
