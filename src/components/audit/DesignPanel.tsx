import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { gradeColor, SEVERITY_TONE } from "@/lib/tone";
import type { CategoryResult, Report } from "@/lib/types";
import { ScoreRing } from "./ScoreRing";

function CategoryCard({ category }: { category: CategoryResult }) {
  const color = gradeColor(category.grade);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-fg">{category.label}</h4>
          <p className="mt-0.5 text-xs text-muted">{category.summary}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-xl font-bold leading-none" style={{ color }}>
            {category.grade}
          </span>
          <span className="tnum text-[0.6875rem] text-subtle">{category.score}/100</span>
        </div>
      </header>

      {/* Score bar. Width is the only thing that changes, so it stays cheap. */}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
        role="img"
        aria-label={`${category.label} score: ${category.score} out of 100`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${category.score}%`, backgroundColor: color }}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted">{category.verdict}</p>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3">
        {category.stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-1.5">
            <dt className="text-[0.6875rem] text-subtle">{stat.label}</dt>
            <dd className="tnum text-xs font-semibold text-fg">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {category.issues.length > 0 ? (
        <ul className="flex flex-col gap-2 border-t border-border pt-3">
          {category.issues.map((issue) => (
            <li key={issue.title} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SEVERITY_TONE[issue.severity] ?? "neutral"}>
                  {issue.severity}
                </Badge>
                {/* Accent tone for real criteria, neutral for best-practice, so
                    the two aren't mistaken for each other at a glance. */}
                {issue.wcag ? (
                  <Badge tone={issue.wcag === "Best practice" ? "neutral" : "accent"}>
                    {issue.wcag}
                  </Badge>
                ) : null}
                <span className="text-xs font-medium text-fg">{issue.title}</span>
                {issue.count ? (
                  <span className="tnum text-[0.6875rem] text-subtle">
                    ×{issue.count}
                  </span>
                ) : null}
              </div>
              {issue.detail ? (
                <p className="text-[0.6875rem] leading-relaxed text-muted">{issue.detail}</p>
              ) : null}
              {issue.helpUrl ? (
                <a
                  href={issue.helpUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="self-start text-[0.6875rem] font-medium text-accent-text underline decoration-accent-border underline-offset-2 transition-colors hover:decoration-current"
                >
                  How to fix this
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Design and accessibility scorecard, from the same crawl as the metadata audit.
 * Rendered on the server - nothing here is interactive.
 */
export function DesignPanel({ report }: { report: Report | null | undefined }) {
  if (!report) {
    return (
      <Card as="section">
        <CardHeader>
          <CardTitle>Design &amp; Accessibility</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="py-6 text-center text-sm text-muted">
            The accessibility pass didn&rsquo;t complete for this page. The metadata results
            above are unaffected.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card as="section">
      <CardHeader>
        <CardTitle>Design &amp; Accessibility</CardTitle>
        <Badge tone="neutral">axe-core · computed styles</Badge>
      </CardHeader>

      <div className="flex flex-wrap items-center gap-6 border-b border-border px-4 py-5">
        <ScoreRing
          score={report.overall.score}
          grade={report.overall.grade}
          label="Design"
        />
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
          {report.overall.verdict}
        </p>
      </div>

      <CardBody className="grid gap-3 sm:grid-cols-2">
        {report.categories.map((category) => (
          <CategoryCard key={category.key} category={category} />
        ))}
      </CardBody>
    </Card>
  );
}
