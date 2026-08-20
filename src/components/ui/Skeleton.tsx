import { cn } from "@/lib/cn";

/**
 * A single shimmering placeholder block.
 *
 * The sweep is a transform on an absolutely-positioned child rather than an
 * animated background-position, so it stays on the compositor no matter how many
 * of these are on screen. Under `prefers-reduced-motion` the global rule stops the
 * sweep and these become static blocks, which still communicate layout.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded bg-surface-sunken", className)}>
      <div
        className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-border to-transparent"
      />
    </div>
  );
}
