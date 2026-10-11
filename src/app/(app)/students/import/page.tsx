"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { AlertCircle, CheckCircle2, Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useImport } from "@/hooks/queries";
import { getErrorMessage } from "@/lib/api";
import { IMPORT_COLUMNS } from "@/validation/schemas";
import type { ImportPreview, ImportResult, ImportRowIssue } from "@/types";

const MAX_ROWS = 1000;
const MAX_BYTES = 2 * 1024 * 1024;

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function templateCsv() {
  const example = [
    "2025-001", "Amina", "", "Yusuf", "2012-04-18", "FEMALE", "", "", "12 Palm Road", "2025-09-08", "ACTIVE",
    "Hauwa Yusuf", "Mother", "hauwa@example.com", "+234 803 000 0000", "", "", "", "", "YES", "YES",
  ];
  return Papa.unparse({ fields: [...IMPORT_COLUMNS], data: [example] });
}

function errorReportCsv(issues: ImportRowIssue[]) {
  return Papa.unparse(issues.map((i) => ({ row: i.row, field: i.field, severity: i.severity, message: i.message })));
}

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { validate, confirm } = useImport();
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function reset() {
    setPreview(null);
    setResult(null);
    setFileName("");
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFile(file?: File) {
    if (!file) return;
    setPreview(null);
    setResult(null);
    setFileError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) return setFileError("Upload a .csv file. Use the template to get the right columns.");
    if (file.size > MAX_BYTES) return setFileError("This file is larger than 2 MB. Split it into smaller files.");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: ({ data, meta }) => {
        const missing = ["admission_number", "first_name", "last_name", "date_of_birth", "gender", "enrollment_date"].filter(
          (c) => !meta.fields?.includes(c),
        );
        if (missing.length) return setFileError(`These required columns are missing: ${missing.join(", ")}. Download the template for the exact headers.`);
        if (data.length === 0) return setFileError("The file has no rows.");
        if (data.length > MAX_ROWS) return setFileError(`The file has ${data.length} rows. The limit is ${MAX_ROWS}.`);
        setFileName(file.name);
        validate.mutate({ fileName: file.name, rows: data }, { onSuccess: setPreview, onError: (e) => setFileError(getErrorMessage(e)) });
      },
      error: () => setFileError("We could not read that file."),
    });
  }

  const errors = preview?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings = preview?.issues.filter((i) => i.severity === "warning") ?? [];

  return (
    <>
      <PageHeader
        title="Import students"
        description="Upload a class list. Every row is checked before anything is saved."
        actions={
          <Button variant="secondary" onClick={() => download("student-import-template.csv", templateCsv())}>
            <Download className="h-4 w-4" aria-hidden />
            Download template
          </Button>
        }
      />

      {result ? (
        <Card className="max-w-2xl">
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
              <h2 className="text-xl font-semibold">Import finished</h2>
            </div>
            <dl className="grid grid-cols-3 gap-4 text-center">
              {[
                ["Rows in file", result.totalRows],
                ["Students added", result.successfulRows],
                ["Rows skipped", result.failedRows],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-panel bg-paper p-4">
                  <dd className="font-display text-3xl font-semibold tabular-nums">{v}</dd>
                  <dt className="text-xs text-muted">{l}</dt>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">
              {result.issues.length > 0 && (
                <Button variant="secondary" onClick={() => download("import-report.csv", errorReportCsv(result.issues))}>
                  <Download className="h-4 w-4" aria-hidden />
                  Download row report
                </Button>
              )}
              <Button asChild>
                <Link href="/students">View students</Link>
              </Button>
              <Button variant="ghost" onClick={reset}>
                Import another file
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="max-w-2xl">
            <CardHeader title="1. Choose a file" description="CSV only, up to 1,000 rows and 2 MB." />
            <CardBody>
              <label
                htmlFor="import-file"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-panel border-2 border-dashed border-line px-6 py-10 text-center hover:border-primary"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onFile(e.dataTransfer.files[0]);
                }}
              >
                <FileUp className="h-8 w-8 text-muted" aria-hidden />
                <span className="font-medium">{fileName || "Drop a CSV here or click to browse"}</span>
                <span className="text-xs text-muted">Dates use YYYY-MM-DD. Gender is MALE or FEMALE.</span>
              </label>
              <input id="import-file" ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              {validate.isPending && <p className="mt-3 text-sm text-muted">Checking every row...</p>}
              {fileError && (
                <p role="alert" className="mt-3 flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2 text-sm text-danger">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {fileError}
                </p>
              )}
            </CardBody>
          </Card>

          {preview && (
            <Card>
              <CardHeader
                title="2. Review"
                description="Rows with errors are skipped. Fix them in your file and upload again, or import the valid rows now."
                action={
                  <div className="flex gap-2">
                    <Badge tone="success">{preview.validRows} ready</Badge>
                    <Badge tone={errors.length ? "danger" : "neutral"}>{new Set(errors.map((e) => e.row)).size} with errors</Badge>
                    {warnings.length > 0 && <Badge tone="warn">{warnings.length} warnings</Badge>}
                  </div>
                }
              />
              {preview.issues.length > 0 && (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Row</Th>
                        <Th>Column</Th>
                        <Th>Problem</Th>
                        <Th>Type</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.issues.map((i, idx) => (
                        <Tr key={idx}>
                          <Td className="tabular-nums">{i.row}</Td>
                          <Td className="font-mono text-xs">{i.field}</Td>
                          <Td>{i.message}</Td>
                          <Td>
                            <Badge tone={i.severity === "error" ? "danger" : "warn"}>{i.severity === "error" ? "Error" : "Warning"}</Badge>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-line p-4">
                <Button
                  disabled={preview.validRows === 0}
                  loading={confirm.isPending}
                  onClick={() =>
                    confirm.mutate(preview.importId, {
                      onSuccess: (r) => {
                        setResult(r);
                        toast.success(`${r.successfulRows} students added`);
                      },
                      onError: (e) => toast.error(getErrorMessage(e)),
                    })
                  }
                >
                  Import {preview.validRows} valid {preview.validRows === 1 ? "row" : "rows"}
                </Button>
                {preview.issues.length > 0 && (
                  <Button variant="secondary" onClick={() => download("import-errors.csv", errorReportCsv(preview.issues))}>
                    <Download className="h-4 w-4" aria-hidden />
                    Download error report
                  </Button>
                )}
                <Button variant="ghost" onClick={reset}>
                  Start over
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
