import { analyzeTags } from "@/lib/a11y/wcag";
import { formatBytes } from "@/lib/meta/measure";
import { displayHost } from "@/lib/meta/resolve";
import type { Check, CheckGroup, CheckLevel, Inspection } from "@/lib/meta/types";
import { CHECK_LABEL, gradeColor } from "@/lib/tone";
import type { AxeViolation, Severity } from "@/lib/types";
import { Timestamp } from "@/components/Timestamp";

const SEVERITY_ORDER: readonly Severity[] = ["critical", "serious", "moderate", "minor"];

const SEVERITY_STYLE: Record<Severity, string> = {
  critical: "border-danger-border bg-danger-subtle text-danger-text",
  serious: "border-danger-border bg-danger-subtle text-danger-text",
  moderate: "border-warning-border bg-warning-subtle text-warning-text",
  minor: "border-border bg-surface-sunken text-muted",
};

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

/* ---------------------------------------------------------------------------
   Accessibility
--------------------------------------------------------------------------- */

function ViolationBlock({ violation }: { violation: AxeViolation }) {
  const impact = violation.impact ?? "minor";
  const { criteria, levels, bestPractice } = analyzeTags(violation.tags);

  return (
    <article className="print-block break-inside-avoid border-t border-border py-4">
      <header className="flex flex-wrap items-center gap-2">
        <Pill className={SEVERITY_STYLE[impact]}>{impact}</Pill>

        {criteria.map((criterion) => (
          <Pill key={criterion.number} className="border-accent-border bg-accent-subtle text-accent-text">
            WCAG {criterion.number} {criterion.title} · Level {criterion.level}
          </Pill>
        ))}

        {/* Separated explicitly: a best-practice finding is not a WCAG failure,
            and a report shouldn't let a reader conflate the two. */}
        {bestPractice ? (
          <Pill className="border-border bg-surface-sunken text-muted">
            Best practice - not a WCAG requirement
          </Pill>
        ) : null}

        {levels.length > 0 && criteria.length === 0 ? (
          <Pill className="border-border bg-surface-sunken text-muted">
            Level {levels.join(", ")}
          </Pill>
        ) : null}
      </header>

      <h4 className="mt-2 text-sm font-semibold text-fg">{violation.help}</h4>
      <p className="mt-1 text-xs leading-relaxed text-muted">{violation.description}</p>

      <p className="mt-2 text-xs text-subtle">
        <span className="tnum font-medium text-muted">{violation.nodeCount}</span> affected{" "}
        {violation.nodeCount === 1 ? "element" : "elements"}
        {violation.nodes.length < violation.nodeCount
          ? ` (first ${violation.nodes.length} listed)`
          : ""}
        {" · Rule "}
        <span className="font-mono">{violation.id}</span>
      </p>

      {/* axe's own remediation text, taken from the first node - it's identical
          across nodes of the same rule and is the most actionable line here. */}
      {violation.nodes[0]?.failureSummary ? (
        <div className="mt-2 rounded-md border border-border bg-bg-subtle p-2.5">
          <p className="whitespace-pre-line text-[0.6875rem] leading-relaxed text-muted">
            {violation.nodes[0].failureSummary}
          </p>
        </div>
      ) : null}

      {violation.nodes.length > 0 ? (
        <ol className="mt-2 flex flex-col gap-1.5">
          {violation.nodes.map((node, index) => (
            <li
              key={`${node.target}-${index}`}
              className="rounded-md border border-border px-2.5 py-2"
            >
              <p className="break-all font-mono text-[0.6875rem] font-medium text-accent-text">
                {node.target}
              </p>
              <pre className="mt-1 overflow-hidden whitespace-pre-wrap break-all font-mono text-[0.625rem] leading-snug text-muted">
                {node.html}
              </pre>
            </li>
          ))}
        </ol>
      ) : null}

      <p className="mt-2 text-[0.6875rem]">
        <a
          href={violation.helpUrl}
          className="print-url text-accent-text underline underline-offset-2"
        >
          How to fix this
        </a>
      </p>
    </article>
  );
}

/* --------------------------------------------------------------------------- */

export function ReportDocument({ inspection }: { inspection: Inspection }) {
  const host = displayHost(inspection.finalUrl);
  const design = inspection.design;
  const violations = design?.violations ?? [];

  // Worst-first within each impact band, most-affected first inside that.
  const byImpact = SEVERITY_ORDER.map((severity) => ({
    severity,
    items: violations
      .filter((v) => (v.impact ?? "minor") === severity)
      .sort((a, b) => b.nodeCount - a.nodeCount),
  })).filter((group) => group.items.length > 0);

  const metaProblems = inspection.checks.filter(
    (c) => c.level === "fail" || c.level === "warn",
  );
  const metaByGroup = new Map<CheckGroup, Check[]>();
  for (const check of metaProblems) {
    const bucket = metaByGroup.get(check.group);
    if (bucket) bucket.push(check);
    else metaByGroup.set(check.group, [check]);
  }

  const totalAffected = violations.reduce((sum, v) => sum + v.nodeCount, 0);

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

      {/* The disclaimer is deliberately the first thing after the title. A
          formatted report reads as authoritative, and automated tooling can only
          evaluate a minority of WCAG criteria. */}
      <section className="print-block mt-5 rounded-lg border border-warning-border bg-warning-subtle p-4">
        <h2 className="text-sm font-semibold text-warning-text">
          This is an automated scan, not a conformance audit
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-warning-text">
          Automated testing detects roughly a third of WCAG issues. A clean result here
          does <strong>not</strong> establish conformance, and this document should not be
          presented as evidence of it. Criteria that need human judgement - whether alt
          text is meaningful, whether focus and reading order make sense, whether error
          messages are actually helpful, whether captions are accurate - are not assessed.
          Use this to find and fix mechanical failures, then commission a manual audit for
          a conformance claim.
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
          {design ? (
            <ScoreBlock
              label="Design & Accessibility"
              score={design.overall.score}
              grade={design.overall.grade}
              caption={`${violations.length} accessibility rules failing across ${totalAffected} element${totalAffected === 1 ? "" : "s"}.`}
            />
          ) : null}
        </div>
        {design ? (
          <p className="mt-3 text-xs leading-relaxed text-muted">{design.overall.verdict}</p>
        ) : null}
      </section>

      {/* Accessibility */}
      <section className="print-break-before mt-8">
        <h2 className="text-base font-semibold text-fg">Accessibility Findings</h2>
        <p className="mt-1 text-xs text-muted">
          Detected by axe-core against the rendered page. Each finding cites the WCAG
          success criteria axe maps it to.
        </p>

        {byImpact.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border bg-bg-subtle p-4 text-xs text-muted">
            {design
              ? "No automated accessibility violations were detected. This does not mean the page is accessible - see the note above."
              : "The accessibility pass did not complete for this page, so there are no findings to report."}
          </p>
        ) : (
          byImpact.map((group) => (
            <section key={group.severity} className="mt-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold capitalize text-fg">
                {group.severity} Impact
                <span className="tnum rounded-full border border-border bg-surface-sunken px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
                  {group.items.length}
                </span>
              </h3>
              {group.items.map((violation) => (
                <ViolationBlock key={violation.id} violation={violation} />
              ))}
            </section>
          ))
        )}
      </section>

      {/* Metadata */}
      <section className="print-break-before mt-8">
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

      {/* Design metrics */}
      {design ? (
        <section className="print-block mt-6">
          <h2 className="text-base font-semibold text-fg">Design System Metrics</h2>
          <p className="mt-1 text-xs text-muted">
            Measured from computed styles on every rendered element, so these survive
            Tailwind, CSS-in-JS, and hashed class names.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {design.categories.map((category) => (
              <div key={category.key} className="print-block rounded-lg border border-border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-fg">{category.label}</h3>
                  <span
                    className="text-sm font-bold"
                    style={{ color: gradeColor(category.grade) }}
                  >
                    {category.grade}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{category.summary}</p>
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {category.stats.map((stat) => (
                    <div key={stat.label} className="flex items-baseline gap-1.5">
                      <dt className="text-[0.625rem] text-subtle">{stat.label}</dt>
                      <dd className="tnum text-[0.6875rem] font-semibold text-fg">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
                  {category.verdict}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Method */}
      <footer className="print-block mt-8 border-t border-border pt-4">
        <h2 className="text-sm font-semibold text-fg">Method</h2>
        <ul className="mt-2 flex flex-col gap-1 text-[0.6875rem] leading-relaxed text-muted">
          <li>
            The page was loaded in headless Chromium at 1366×900 and given time to paint, so
            client-rendered metadata is captured as a crawler would see it.
          </li>
          <li>
            Accessibility findings come from axe-core; WCAG references are decoded from the
            rule tags axe itself reports.
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
