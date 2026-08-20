export type Severity = "critical" | "serious" | "moderate" | "minor";

export type CategoryKey = "accessibility" | "color" | "typography" | "spacing";

export interface Issue {
  severity: Severity;
  title: string;
  detail?: string;
  count?: number;
  /**
   * Short WCAG reference for display, e.g. "1.4.3 · AA", or "Best practice" when
   * axe classes the rule as its own recommendation rather than a requirement.
   */
  wcag?: string;
  /** Deque rule documentation, when the issue came from an axe rule. */
  helpUrl?: string;
}

export interface CategoryResult {
  key: CategoryKey;
  label: string;
  score: number;
  grade: string;
  /** Factual one-liner: the measured numbers. */
  summary: string;
  /** What the numbers mean and what to do about them. */
  verdict: string;
  issues: Issue[];
  stats: { label: string; value: string | number }[];
}

export interface Report {
  url: string;
  finalUrl: string;
  title: string;
  fetchedAt: string;
  durationMs: number;
  overall: { score: number; grade: string; verdict: string };
  categories: CategoryResult[];
  /**
   * Full accessibility findings, kept alongside the scored categories so the
   * printable report can cite WCAG criteria and selectors rather than only the
   * eight summarised issues the on-screen card shows.
   */
  violations: AxeViolation[];
}

/** Raw metrics collected in the browser context before scoring. */
export interface RawMetrics {
  elementCount: number;
  textColors: Record<string, number>;
  bgColors: Record<string, number>;
  fontSizes: Record<string, number>;
  fontFamilies: Record<string, number>;
  fontWeights: Record<string, number>;
  spacings: Record<string, number>;
  radii: Record<string, number>;
}

/** One failing element, enough for a developer to locate and fix it. */
export interface AxeNode {
  /** CSS selector path, joined when the element is inside frames. */
  target: string;
  /** The failing markup, truncated - some nodes are enormous. */
  html: string;
  /** axe's "Fix any of the following…" guidance for this specific element. */
  failureSummary: string | null;
}

export interface AxeViolation {
  id: string;
  impact: Severity | null;
  help: string;
  description: string;
  /** Deque rule documentation. */
  helpUrl: string;
  /** Raw axe tags, e.g. ["cat.color", "wcag2aa", "wcag143"]. */
  tags: string[];
  /** Total failing elements, which may exceed `nodes.length`. */
  nodeCount: number;
  /** A capped sample of failing elements, for the report and detail views. */
  nodes: AxeNode[];
}
