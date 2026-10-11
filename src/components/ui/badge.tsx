import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/utils";

type Tone = "neutral" | "success" | "warn" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/5 text-muted",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-primary-soft text-primary",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  ACTIVE: "success",
  PENDING: "warn",
  INVITED: "warn",
  SUSPENDED: "danger",
  DEACTIVATED: "neutral",
  WITHDRAWN: "neutral",
  GRADUATED: "info",
  REVOKED: "danger",
  EXPIRED: "neutral",
  NONE: "neutral",
  SUCCESS: "success",
  DENIED: "danger",
  FAILURE: "warn",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "neutral"}>{titleCase(status)}</Badge>;
}
