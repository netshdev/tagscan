import { formatBytes } from "@/lib/meta/measure";
import { displayHost } from "@/lib/meta/resolve";
import type { Check, CheckGroup, CheckLevel, Inspection } from "@/lib/meta/types";
import { CHECK_LABEL, gradeColor } from "@/lib/tone";
import { Timestamp } from "@/components/Timestamp";

const GROUP_LABEL: Record<CheckGroup, string> = {
  essentials: "Essentials",
  social: "Social Cards",
  image: "Social Image",
  "structured-data": "Structured Data",
  indexing: "Indexing",
  icons: "Icons & Chrome",
};

const LEVEL_STYLE: Record<CheckLevel, string> = {
  fail: "border-danger-border bg-danger-subtle text-danger-text",
  warn: "border-warning-border bg-warning-subtle text-warning-text",
  pass: "border-success-border bg-success-subtle text-success-text",
  info: "border-info-border bg-info-subtle text-info-text",
};

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function ScoreBlock({
  label,
  score,
  grade,
  caption,
}: {
  label: string;
  score: number;
  grade: string;
  caption: string;
}) {
  return (
    <div className="print-block flex-1 rounded-lg border border-border p-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold leading-none" style={{ color: gradeColor(grade) }}>
          {grade}
        </span>
        <span className="tnum text-sm text-muted">{score}/100</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">{caption}</p>
    </div>
  );
}

/* --------------------------------------------------------------------------- */

export function ReportDocument({ inspection }: { inspection: Inspection }) {
  const host = displayHost(inspection.finalUrl);

  const metaProblems = inspection.checks.filter(
    (c) => c.level === "fail" || c.level === "warn",
  );
  const metaByGroup = new Map<CheckGroup, Check[]>();
  for (const check of metaProblems) {
    const bucket = metaByGroup.get(check.group);
    if (bucket) bucket.push(check);
    else metaByGroup.set(check.group, [check]);
  }

  return (
    <article className="mx-auto w-full max-w-3xl">
      {/* Cover */}
      <header className="print-block">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-accent-text">
          TagScan Report
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg">{host}</h1>
        <p className="mt-1 break-all text-sm text-muted">{inspection.finalUrl}</p>
        <p className="mt-1 text-xs text-subtle">
          Scanned <Timestamp iso={inspection.fetchedAt} /> · Page title:{" "}
          {inspection.title || "(none)"}
        </p>
      </header>

      {/* The caveat is deliberately the first thing after the title: a formatted
          report reads as authoritative, and the scan has one specific blind spot
          that changes how every finding below should be read. */}
      <section className="print-block mt-5 rounded-lg border border-warning-border bg-warning-subtle p-4">
        <h2 className="text-sm font-semibold text-warning-text">
          Measured from the HTML as served, without running JavaScript
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-warning-text">
          This is what a crawler that doesn&rsquo;t execute scripts receives - which is how
          most search and social crawlers fetch a page. If this site sets its tags on the
          client (via a tag manager, or a framework&rsquo;s head component during a
          client-side navigation), those tags are <strong>not</strong> counted here, and a
          finding below may report something missing that a browser would show. Tags that
          matter for search and sharing belong in the served HTML for exactly this reason.
        </p>
      </section>

      {/* Scores */}
      <section className="mt-6">
        <h2 className="text-base font-semibold text-fg">At a Glance</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <ScoreBlock
            label="Metadata"
            score={inspection.summary.score}
            grade={inspection.summary.grade}
            caption={`${inspection.summary.counts.fail} failing, ${inspection.summary.counts.warn} warnings, ${inspection.summary.counts.pass} passing across ${inspection.checks.length} checks.`}
          />
        </div>
      </section>

      {/* Metadata */}
      <section className="mt-8">
        <h2 className="text-base font-semibold text-fg">Search &amp; Social Metadata</h2>
        <p className="mt-1 text-xs text-muted">
          Only findings that need attention are listed. {inspection.summary.counts.pass}{" "}
          checks passed and are omitted.
        </p>

        {metaProblems.length === 0 ? (
          <p className="mt-4 rounded-lg border border-success-border bg-success-subtle p-4 text-xs text-success-text">
            Every metadata check passed.
          </p>
        ) : (
          Array.from(metaByGroup.entries()).map(([group, checks]) => (
            <section key={group} className="print-block mt-4">
              <h3 className="text-sm font-semibold text-fg">{GROUP_LABEL[group]}</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {checks.map((check) => (
                  <li
                    key={check.id}
                    className="print-block rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill className={LEVEL_STYLE[check.level]}>
                        {CHECK_LABEL[check.level]}
                      </Pill>
                      <span className="text-sm font-medium text-fg">{check.title}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{check.detail}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </section>

      {/* Social image */}
      {inspection.probes.length > 0 ? (
        <section className="print-block mt-6">
          <h3 className="text-sm font-semibold text-fg">Social Image</h3>
          <dl className="mt-2 rounded-lg border border-border p-3 text-xs">
            {inspection.probes.map((probe) => (
              <div key={probe.url} className="flex flex-col gap-1">
                <dt className="break-all font-mono text-[0.6875rem] text-accent-text">
                  {probe.url}
                </dt>
                <dd className="text-muted">
                  {probe.ok
                    ? [
                        probe.width && probe.height
                          ? `${probe.width}×${probe.height}`
                          : "dimensions unknown",
                        probe.bytes ? formatBytes(probe.bytes) : null,
                        probe.contentType,
                        probe.width && probe.height
                          ? `ratio ${(probe.width / probe.height).toFixed(2)}:1`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : `Not reachable - ${probe.error ?? `HTTP ${probe.status}`}`}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Method */}
      <footer className="print-block mt-8 border-t border-border pt-4">
        <h2 className="text-sm font-semibold text-fg">Method</h2>
        <ul className="mt-2 flex flex-col gap-1 text-[0.6875rem] leading-relaxed text-muted">
          <li>
            The page was fetched once over HTTP and its markup parsed directly. No
            JavaScript was executed - see the note above the scores.
          </li>
          <li>
            Where a tag appears more than once the first value is reported, which is how
            crawlers generally resolve the conflict.
          </li>
          <li>
            The social image was requested separately to confirm it resolves and to read
            its real dimensions and weight from the image header.
          </li>
          <li>
            Platform truncation limits and image rules follow each vendor&rsquo;s published
            card documentation, which changes without notice.
          </li>
          <li className="tnum">
            Scan completed in {(inspection.durationMs / 1000).toFixed(1)}s.
          </li>
        </ul>
      </footer>
    </article>
  );
}
