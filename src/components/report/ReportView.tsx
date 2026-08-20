"use client";

import { useRef, useState } from "react";
import { downloadStandaloneHtml, safeFilename } from "@/lib/download";
import { displayHost } from "@/lib/meta/resolve";
import type { Inspection } from "@/lib/meta/types";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ReportDocument } from "@/components/report/ReportDocument";

/**
 * The report as an in-app view.
 *
 * It used to be its own route that re-read a stored inspection by id. With nothing
 * persisted, it renders straight from the result in memory - which also means Print
 * and Download always match exactly what's on screen, including any edits.
 */
export function ReportView({ inspection }: { inspection: Inspection }) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const host = displayHost(inspection.finalUrl);

  async function download() {
    const node = documentRef.current;
    if (!node) return;

    setSaving(true);
    try {
      await downloadStandaloneHtml(
        node,
        `${host} - Metadata Report`,
        safeFilename(host, inspection.fetchedAt, "html"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card data-print="hide">
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle>Report</CardTitle>
            <p className="text-xs text-muted">
              Print for a PDF, or save a self-contained HTML file with the fonts and
              styles embedded.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="secondary" size="md" onClick={download} pending={saving}>
              {saving ? "Preparing…" : "Download HTML"}
            </Button>
            <Button variant="primary" size="md" onClick={() => window.print()}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2" />
                <rect x="6" y="14" width="12" height="7" rx="1" />
              </svg>
              Print or Save as PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* The ref target is exactly what gets saved, so the wrapper carries the
          document's own padding rather than inheriting the app's layout. */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs sm:p-8">
        <div ref={documentRef}>
          <ReportDocument inspection={inspection} />
        </div>
      </div>
    </div>
  );
}
