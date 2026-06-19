import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/lib/mock-data";

const map: Record<ClientStatus, { label: string; cls: string; dot: string }> = {
  "on-track": {
    label: "On track",
    cls: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  "needs-attention": {
    label: "Needs attention",
    cls: "bg-warning/15 text-warning-foreground border-warning/30",
    dot: "bg-warning",
  },
  "at-risk": {
    label: "At risk",
    cls: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
  transitioned: {
    label: "Transitioned",
    cls: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
};

export function StatusBadge({ status, className }: { status: ClientStatus; className?: string }) {
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        s.cls,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "success" | "warning" | "destructive" }) {
  const bg =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
      ? "bg-warning"
      : tone === "destructive"
      ? "bg-destructive"
      : "bg-primary";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${value}%` }} />
    </div>
  );
}

export function Avatar({ initials, tone = "primary" }: { initials: string; tone?: "primary" | "accent" | "muted" }) {
  const cls =
    tone === "accent"
      ? "bg-accent text-accent-foreground"
      : tone === "muted"
      ? "bg-muted text-foreground"
      : "bg-primary text-primary-foreground";
  return (
    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold", cls)}>
      {initials}
    </div>
  );
}
