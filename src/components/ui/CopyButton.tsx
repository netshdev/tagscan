"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Status = "idle" | "copied" | "failed";

/**
 * Copy-to-clipboard with a self-clearing confirmation. The timer is stored in a
 * ref and cleared on unmount so a fast unmount can't fire setState on a dead
 * component.
 */
export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
  className,
}: {
  value: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    timer.current = setTimeout(() => setStatus("idle"), 1800);
  }

  const text = status === "copied" ? "Copied" : status === "failed" ? "Failed" : label;

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface font-medium",
        "transition-colors duration-150 hover:bg-surface-hover hover:border-border-strong",
        size === "sm" ? "h-7 px-2 text-[0.6875rem]" : "h-9 px-3 text-xs",
        status === "copied" && "border-success-border bg-success-subtle text-success-text",
        status === "failed" && "border-danger-border bg-danger-subtle text-danger-text",
        className,
      )}
    >
      <span aria-hidden="true">
        {status === "copied" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
            <path d="m20 6-11 11-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
            <rect x="9" y="9" width="12" height="12" rx="2.5" />
            <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </span>
      {text}
      {/* Announce the result without moving focus. */}
      <span aria-live="polite" className="sr-only">
        {status === "copied" ? "Copied to clipboard" : status === "failed" ? "Copy failed" : ""}
      </span>
    </button>
  );
}
