import { analyzeTags } from "./a11y/wcag";
import type {
  AxeViolation,
  CategoryResult,
  Issue,
  RawMetrics,
  Report,
  Severity,
} from "./types";

const IMPACT_WEIGHT: Record<Severity, number> = {
  critical: 16,
  serious: 9,
  moderate: 4,
  minor: 1,
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

export function grade(score: number): string {
  if (score >= 93) return "A";
  if (score >= 85) return "A-";
  if (score >= 78) return "B+";
  if (score >= 70) return "B";
  if (score >= 62) return "C+";
  if (score >= 55) return "C";
  if (score >= 45) return "D";
  return "F";
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const distinct = (m: Record<string, number>) => Object.keys(m).length;

function topEntries(m: Record<string, number>, n: number): [string, number][] {
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function scoreAccessibility(violations: AxeViolation[]): CategoryResult {
  let penalty = 0;
  const counts: Record<Severity, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };

  for (const item of violations) {
    const impact = item.impact ?? "minor";
    // Cap per-rule node counts so one repeated violation can't dominate the score.
    penalty += IMPACT_WEIGHT[impact] * Math.min(item.nodeCount, 6);
    counts[impact] += 1;
  }
  const score = clamp(100 - penalty);

  const issues: Issue[] = violations
    .slice()
    .sort((a, b) => SEVERITY_ORDER[a.impact ?? "minor"] - SEVERITY_ORDER[b.impact ?? "minor"])
    .slice(0, 8)
    .map((item) => {
      const { criteria, levels, bestPractice } = analyzeTags(item.tags);
      return {
        severity: item.impact ?? "minor",
        title: item.help,
        detail: item.description,
        count: item.nodeCount,
        // Compact enough for a badge: criterion numbers plus the level.
        wcag: bestPractice
          ? "Best practice"
          : criteria.length > 0
            ? `WCAG ${criteria.map((c) => c.number).join(", ")}${levels.length ? ` · ${levels.join("/")}` : ""}`
            : undefined,
        helpUrl: item.helpUrl,
      } satisfies Issue;
    });

  const affected = violations.reduce((sum, item) => sum + item.nodeCount, 0);
  const verdict =
    score >= 90
      ? "No significant barriers found by automated testing. Manual keyboard and screen-reader passes are still worth doing."
      : counts.critical > 0
        ? `${counts.critical} critical failure${counts.critical > 1 ? "s" : ""} block assistive technology outright. Fix these before anything else on this list.`
        : `${affected} element${affected === 1 ? "" : "s"} fail automated checks. Most are mechanical fixes - labels, contrast, and landmark structure.`;

  return {
    key: "accessibility",
    label: "Accessibility",
    score,
    grade: grade(score),
    summary: `${violations.length} rule${violations.length === 1 ? "" : "s"} failing across ${affected} element${affected === 1 ? "" : "s"}.`,
    verdict,
    issues,
    stats: [
      { label: "Critical", value: counts.critical },
      { label: "Serious", value: counts.serious },
      { label: "Moderate", value: counts.moderate },
      { label: "Minor", value: counts.minor },
    ],
  };
}

function scoreColor(m: RawMetrics): CategoryResult {
  const textCount = distinct(m.textColors);
  const bgCount = distinct(m.bgColors);
  const total = textCount + bgCount;

  // A disciplined system lives in roughly a dozen resolved colours; penalise sprawl.
  const score = clamp(100 - Math.max(0, total - 12) * 2.5);

  const issues: Issue[] = [];
  if (textCount > 8) {
    issues.push({
      severity: textCount > 16 ? "serious" : "moderate",
      title: `${textCount} distinct text colours`,
      detail:
        "A coherent palette usually needs three to six. More than that normally means one-off values rather than tokens.",
    });
  }
  if (bgCount > 10) {
    issues.push({
      severity: bgCount > 20 ? "serious" : "moderate",
      title: `${bgCount} distinct background colours`,
      detail: "Surfaces should resolve to a small set of named tokens, not per-component values.",
    });
  }

  const verdict =
    total <= 12
      ? "A tight palette. The colours resolve to a small, deliberate set."
      : total <= 24
        ? `${total} distinct colours on one page. Consolidating the near-duplicates into tokens would tighten this considerably.`
        : `${total} distinct colours suggests no shared palette is being enforced. Start by auditing the greys - they are usually where the duplication hides.`;

  return {
    key: "color",
    label: "Colour",
    score,
    grade: grade(score),
    summary: `${total} distinct colours in use (${textCount} text, ${bgCount} surface).`,
    verdict,
    issues,
    stats: [
      { label: "Text", value: textCount },
      { label: "Surface", value: bgCount },
      { label: "Total", value: total },
    ],
  };
}

function scoreTypography(m: RawMetrics): CategoryResult {
  const sizeCount = distinct(m.fontSizes);
  const familyCount = distinct(m.fontFamilies);
  const weightCount = distinct(m.fontWeights);

  const score = clamp(
    100 -
      Math.max(0, sizeCount - 7) * 4 -
      Math.max(0, familyCount - 2) * 12 -
      Math.max(0, weightCount - 4) * 4,
  );

  const issues: Issue[] = [];
  if (sizeCount > 7) {
    issues.push({
      severity: sizeCount > 14 ? "serious" : "moderate",
      title: `${sizeCount} distinct font sizes`,
      detail: "A type scale is usually five to seven steps. Beyond that the steps stop being meaningful.",
    });
  }
  if (familyCount > 2) {
    issues.push({
      severity: "moderate",
      title: `${familyCount} font families`,
      detail: `Detected: ${topEntries(m.fontFamilies, 4)
        .map(([f]) => f)
        .join(", ")}. Each additional family is another network request and another rendering inconsistency.`,
    });
  }

  const verdict =
    score >= 88
      ? "The type scale is disciplined - a small number of sizes, families, and weights doing all the work."
      : sizeCount > 14
        ? `${sizeCount} font sizes means the scale is not being enforced. Map the existing values onto a fixed ramp and replace them.`
        : `${sizeCount} sizes across ${familyCount} famil${familyCount === 1 ? "y" : "ies"}. Trimming to a defined scale is the highest-leverage change here.`;

  return {
    key: "typography",
    label: "Typography",
    score,
    grade: grade(score),
    summary: `${sizeCount} sizes · ${familyCount} famil${familyCount === 1 ? "y" : "ies"} · ${weightCount} weights.`,
    verdict,
    issues,
    stats: [
      { label: "Sizes", value: sizeCount },
      { label: "Families", value: familyCount },
      { label: "Weights", value: weightCount },
    ],
  };
}

function scoreSpacing(m: RawMetrics): CategoryResult {
  const values = Object.entries(m.spacings);
  const totalUses = values.reduce((sum, [, count]) => sum + count, 0);
  const onGridUses = values
    .filter(([px]) => Number(px) % 4 === 0)
    .reduce((sum, [, count]) => sum + count, 0);
  const onGridPct = totalUses > 0 ? Math.round((onGridUses / totalUses) * 100) : 100;
  const distinctValues = values.length;

  const score = clamp(
    100 - (100 - onGridPct) * 0.6 - Math.max(0, distinctValues - 12) * 2,
  );

  const issues: Issue[] = [];
  if (onGridPct < 85) {
    issues.push({
      severity: onGridPct < 60 ? "serious" : "moderate",
      title: `${onGridPct}% of spacing sits on a 4px grid`,
      detail:
        "Off-grid values like 13px, 7px, or 22px are usually hand-tuned one-offs rather than scale steps.",
    });
  }
  if (distinctValues > 12) {
    issues.push({
      severity: distinctValues > 24 ? "serious" : "moderate",
      title: `${distinctValues} distinct spacing values`,
      detail: "A spacing scale should be a handful of steps reused everywhere.",
    });
  }

  const verdict =
    score >= 88
      ? "Spacing is consistent and grid-aligned - margins and padding come from a shared scale."
      : onGridPct < 60
        ? `Only ${onGridPct}% of spacing aligns to a 4px grid, which points to values being eyeballed per component rather than taken from a scale.`
        : `${distinctValues} distinct spacing values are in play. Collapsing the near-duplicates onto a fixed scale is a mechanical, low-risk cleanup.`;

  return {
    key: "spacing",
    label: "Spacing",
    score,
    grade: grade(score),
    summary: `${onGridPct}% on a 4px grid across ${distinctValues} distinct values.`,
    verdict,
    issues,
    stats: [
      { label: "On grid", value: `${onGridPct}%` },
      { label: "Values", value: distinctValues },
      { label: "Radii", value: distinct(m.radii) },
    ],
  };
}

function overallVerdict(score: number): string {
  if (score >= 90) return "Carefully built. The design system is being enforced, not just documented.";
  if (score >= 78) return "Solid foundations with a few soft spots worth tightening.";
  if (score >= 62) return "Workable, but the details are drifting. Design debt is accumulating in the places below.";
  if (score >= 45) return "The fundamentals need attention - start with accessibility, then consolidate the tokens.";
  return "This needs a systematic pass rather than spot fixes. Work top-down from the accessibility failures.";
}

export function buildReport(input: {
  url: string;
  finalUrl: string;
  title: string;
  metrics: RawMetrics;
  violations: AxeViolation[];
  durationMs: number;
  fetchedAt: string;
}): Report {
  const categories: CategoryResult[] = [
    scoreAccessibility(input.violations),
    scoreColor(input.metrics),
    scoreTypography(input.metrics),
    scoreSpacing(input.metrics),
  ];

  // Accessibility carries the most weight - it's the one category with users on
  // the other end of it rather than only maintainers.
  const weights: Record<string, number> = {
    accessibility: 0.35,
    color: 0.22,
    typography: 0.22,
    spacing: 0.21,
  };
  const overallScore = clamp(
    categories.reduce((sum, c) => sum + c.score * weights[c.key], 0),
  );

  return {
    url: input.url,
    finalUrl: input.finalUrl,
    title: input.title,
    fetchedAt: input.fetchedAt,
    durationMs: input.durationMs,
    overall: {
      score: overallScore,
      grade: grade(overallScore),
      verdict: overallVerdict(overallScore),
    },
    categories,
    violations: input.violations,
  };
}
