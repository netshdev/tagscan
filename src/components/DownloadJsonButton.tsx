"use client";

import { downloadJson, safeFilename } from "@/lib/download";
import { displayHost } from "@/lib/meta/resolve";
import type { Inspection } from "@/lib/meta/types";

/** Saves the raw result for diffing, archiving, or feeding into CI. */
export function DownloadJsonButton({ inspection }: { inspection: Inspection }) {
  const host = displayHost(inspection.finalUrl);

  return (
    <button
      type="button"
      onClick={() =>
        downloadJson(inspection, safeFilename(host, inspection.fetchedAt, "json"))
      }
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-fg transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5"
        aria-hidden="true"
      >
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      JSON
    </button>
  );
}
