"use client";

import { displayHost } from "@/lib/meta/resolve";
import type { Inspection } from "@/lib/meta/types";
import { gradeColor } from "@/lib/tone";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Timestamp } from "@/components/Timestamp";
import { DownloadJsonButton } from "@/components/DownloadJsonButton";
import { UrlForm } from "@/components/UrlForm";

interface Props {
  inspection: Inspection;
  pending: boolean;
  onReinspect: (url: string) => void;
  error: string | null;
}

export function ResultHeader({ inspection, pending, onReinspect, error }: Props) {
  const host = displayHost(inspection.finalUrl);

  return (
    <Card as="header">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-fg">{host}</h2>
              <Badge tone="neutral">
                <span
                  className="font-bold"
                  style={{ color: gradeColor(inspection.summary.grade) }}
                >
                  {inspection.summary.grade}
                </span>
                <span className="tnum">{inspection.summary.score}/100</span>
              </Badge>
            </div>

            <p className="mt-1 truncate text-xs text-muted" title={inspection.finalUrl}>
              {inspection.finalUrl}
            </p>

            <p className="mt-1 text-xs text-subtle">
              Inspected <Timestamp iso={inspection.fetchedAt} /> in{" "}
              <span className="tnum">{(inspection.durationMs / 1000).toFixed(1)}s</span>
            </p>
          </div>

          {/* Nothing is persisted, so there is no link to copy - the raw data is
              still worth taking away, and it's generated in the browser. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <DownloadJsonButton inspection={inspection} />
          </div>
        </div>

        {/* Re-inspecting the same or another URL without leaving the results. */}
        <div className="border-t border-border pt-4">
          <UrlForm
            onSubmit={onReinspect}
            pending={pending}
            size="compact"
            initialValue={inspection.finalUrl}
          />
          {error ? (
            <p role="alert" className="mt-2 text-xs text-danger-text">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
