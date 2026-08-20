import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Compound card. Header/Body/Footer are separate parts so callers compose the
 * pieces they need instead of passing `title`/`action`/`footer` props that would
 * grow with every new layout.
 */
export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "header" | "footer";
}) {
  return (
    <As
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-xs",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-sm font-semibold text-fg", className)}>{children}</h3>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-border bg-bg-subtle px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
