import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "border-border bg-surface-sunken text-muted",
  accent: "border-accent-border bg-accent-subtle text-accent-text",
  success: "border-success-border bg-success-subtle text-success-text",
  warning: "border-warning-border bg-warning-subtle text-warning-text",
  danger: "border-danger-border bg-danger-subtle text-danger-text",
  info: "border-info-border bg-info-subtle text-info-text",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small count pill for "3 issues" style annotations; stays width-stable. */
export function CountBadge({ count, tone = "neutral" }: { count: number; tone?: Tone }) {
  return (
    <span
      className={cn(
        "tnum inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 text-[0.6875rem] font-semibold",
        TONES[tone],
      )}
    >
      {count}
    </span>
  );
}
