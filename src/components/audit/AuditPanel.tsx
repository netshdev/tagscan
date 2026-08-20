"use client";

import { useMemo, useState } from "react";
import { Badge, CountBadge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { AuditSummary, Check, CheckGroup, CheckLevel, MetaDraft } from "@/lib/meta/types";
import { CHECK_LABEL, CHECK_TONE } from "@/lib/tone";
import { ScoreRing } from "./ScoreRing";

const GROUP_LABEL: Record<CheckGroup, string> = {
  essentials: "Essentials",
  social: "Social Cards",
  image: "Social Image",
  "structured-data": "Structured Data",
  indexing: "Indexing",
  icons: "Icons & Chrome",
};

const GROUP_ORDER: readonly CheckGroup[] = [
  "essentials",
  "social",
  "image",
  "structured-data",
  "indexing",
  "icons",
];

type Filter = "all" | "problems" | "passing";

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: "problems", label: "Needs Work" },
  { value: "all", label: "All" },
  { value: "passing", label: "Passing" },
];

function LevelIcon({ level }: { level: CheckLevel }) {
  const common = "size-3.5 shrink-0";
  if (level === "pass") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={common} aria-hidden="true">
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }
  if (level === "fail") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={common} aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  if (level === "warn") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={common} aria-hidden="true">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" className={common} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

const LEVEL_STYLES: Record<CheckLevel, string> = {
  pass: "text-success-text",
  warn: "text-warning-text",
  fail: "text-danger-text",
  info: "text-info-text",
};

interface Props {
  checks: Check[];
  summary: AuditSummary;
  /**
   * True when only tag-level checks ran, because no crawl was available. The
   * score is then computed from a subset and must not be presented as a full one.
   */
  partial?: boolean;
  /** Focuses the matching editor input. Absent when there is nothing to jump to. */
  onJumpToField?: (field: keyof MetaDraft) => void;
}

export function AuditPanel({ checks, summary, partial = false, onJumpToField }: Props) {
  const [filter, setFilter] = useState<Filter>("problems");

  const visible = useMemo(() => {
    const matches = (c: Check) =>
      filter === "all"
        ? true
        : filter === "problems"
          ? c.level === "fail" || c.level === "warn"
          : c.level === "pass" || c.level === "info";

    // Single pass: filter and bucket by group at once.
    const byGroup = new Map<CheckGroup, Check[]>();
    for (const check of checks) {
      if (!matches(check)) continue;
      const bucket = byGroup.get(check.group);
      if (bucket) bucket.push(check);
      else byGroup.set(check.group, [check]);
    }
    return byGroup;
  }, [checks, filter]);

  const total = Array.from(visible.values()).reduce((n, list) => n + list.length, 0);
  const problems = summary.counts.fail + summary.counts.warn;

  return (
    <Card as="section">
      <CardHeader className="gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle>Audit</CardTitle>
          {partial ? <Badge tone="warning">Partial</Badge> : null}
        </div>
        <div
          role="group"
          aria-label="Filter checks"
          className="flex gap-1 rounded-lg bg-surface-sunken p-0.5"
        >
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[0.6875rem] font-medium",
                "transition-[background-color,border-color,color] duration-150",
                filter === option.value
                  ? "border-border-strong bg-surface-selected text-fg shadow-xs"
                  : "border-transparent text-muted hover:text-fg",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* An incomplete score is worse than no score if it isn't labelled. */}
      {partial ? (
        <p className="border-b border-warning-border bg-warning-subtle px-4 py-3 text-xs leading-relaxed text-warning-text">
          <strong className="font-semibold">Tag-level checks only.</strong> This view came
          from a shared link, so there is no crawl behind it. Document language, viewport,
          heading structure, structured data, icons, and the social image fetch were not
          checked - and the score reflects only what could be. Scan the URL for the full
          audit.
        </p>
      ) : null}

      {/* Score summary */}
      <div className="flex flex-wrap items-center gap-6 border-b border-border px-4 py-5">
        <ScoreRing score={summary.score} grade={summary.grade} label={partial ? "Partial" : "Meta"} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-sm text-muted">
            {problems === 0
              ? "Every check passed. This page's metadata is in good shape."
              : `${problems} of ${checks.length} checks need attention.`}
          </p>

          <ul className="flex flex-wrap gap-2">
            {(["fail", "warn", "pass", "info"] as const).map((level) =>
              summary.counts[level] > 0 ? (
                <li key={level}>
                  <Badge tone={CHECK_TONE[level]}>
                    <LevelIcon level={level} />
                    {summary.counts[level]} {CHECK_LABEL[level]}
                    {level === "pass" && summary.counts[level] !== 1 ? "es" : ""}
                    {level !== "pass" && summary.counts[level] !== 1 ? "s" : ""}
                  </Badge>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </div>

      <CardBody className="p-0">
        {total === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {filter === "problems"
              ? "Nothing to fix here - switch to All to see the passing checks."
              : "No checks in this view."}
          </p>
        ) : (
          GROUP_ORDER.map((group) => {
            const list = visible.get(group);
            if (!list?.length) return null;

            return (
              <section key={group} className="border-b border-border last:border-b-0">
                <h4 className="flex items-center gap-2 bg-bg-subtle px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
                  {GROUP_LABEL[group]}
                  <CountBadge count={list.length} />
                </h4>

                <ul className="divide-y divide-border">
                  {list.map((check) => {
                    const jumpable = check.field && onJumpToField;
                    return (
                      <li
                        key={check.id}
                        className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                      >
                        <span className={cn("mt-0.5", LEVEL_STYLES[check.level])}>
                          <LevelIcon level={check.level} />
                          <span className="sr-only">{CHECK_LABEL[check.level]}: </span>
                        </span>

                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <p className="text-sm font-medium text-fg">{check.title}</p>
                          <p className="text-xs leading-relaxed text-muted">{check.detail}</p>

                          {jumpable ? (
                            <button
                              type="button"
                              onClick={() => onJumpToField(check.field!)}
                              className="self-start text-xs font-medium text-accent-text underline decoration-accent-border underline-offset-2 transition-colors hover:decoration-current"
                            >
                              Edit this tag
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}
