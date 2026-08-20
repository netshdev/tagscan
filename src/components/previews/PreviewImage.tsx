"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface Props {
  src: string;
  alt: string;
  /** width / height - the box is reserved from this, so nothing shifts on load. */
  ratio: number;
  /** Rendered width in px; drives the explicit width/height attributes. */
  width: number;
  className?: string;
  /** Copy shown when there is no image at all, tuned per platform. */
  emptyLabel?: string;
  /** Dark platform chrome needs a dark placeholder. */
  scheme?: "light" | "dark";
}

/**
 * Deliberately a plain <img>, not next/image: sources are arbitrary third-party
 * hosts, which the optimizer would reject without an unbounded `remotePatterns`
 * allowlist. Width and height are always set so the card never shifts on load.
 *
 * A broken image is a finding, not a glitch - the error state says so rather than
 * silently hiding the frame.
 */
export function PreviewImage({
  src,
  alt,
  ratio,
  width,
  className,
  emptyLabel = "No image",
  scheme = "light",
}: Props) {
  // Storing *which* src failed rather than a boolean makes the failure state
  // fully derived: a new src is simply not the failed one, so editing the image
  // URL clears the error with no effect and no reset logic.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src) && failedSrc === src;

  const height = Math.round(width / ratio);
  const dark = scheme === "dark";

  if (!src || failed) {
    return (
      <div
        style={{ aspectRatio: String(ratio) }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1.5 text-center",
          dark ? "bg-[#1e1f22] text-[#949ba4]" : "bg-[#f0f0f0] text-[#8a8a8a]",
          className,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6 opacity-70"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-4.5-4.5L3 21" />
        </svg>
        <span className="px-3 text-[11px] font-medium">
          {failed ? "Image failed to load" : emptyLabel}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts; next/image would need an open remotePatterns allowlist
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
      style={{ aspectRatio: String(ratio) }}
      className={cn(
        "w-full object-cover",
        dark ? "bg-[#1e1f22]" : "bg-[#f0f0f0]",
        className,
      )}
    />
  );
}
