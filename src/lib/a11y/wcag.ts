/**
 * Maps axe-core rule tags onto WCAG success criteria.
 *
 * axe already tells us which criteria a rule maps to - a violation carries tags
 * like `["cat.color", "wcag2aa", "wcag143"]`, where `wcag143` *is* SC 1.4.3 and
 * `wcag2aa` is the conformance level. Nothing here is inferred; it's decoding
 * data the scan already produced.
 */

export type ConformanceLevel = "A" | "AA" | "AAA";

export interface WcagCriterion {
  /** Dotted number, e.g. "1.4.3". */
  number: string;
  title: string;
  level: ConformanceLevel;
  /** WCAG version the criterion was introduced in. */
  since: "2.0" | "2.1" | "2.2";
  /** W3C Understanding document. */
  url: string;
}

type Entry = readonly [number: string, title: string, level: ConformanceLevel, since: "2.0" | "2.1" | "2.2"];

/**
 * Success criteria that axe-core actually tags. Not the full WCAG catalogue -
 * criteria no automated tool can evaluate are deliberately absent.
 */
const CRITERIA: readonly Entry[] = [
  ["1.1.1", "Non-text Content", "A", "2.0"],
  ["1.2.1", "Audio-only and Video-only (Prerecorded)", "A", "2.0"],
  ["1.2.2", "Captions (Prerecorded)", "A", "2.0"],
  ["1.2.3", "Audio Description or Media Alternative (Prerecorded)", "A", "2.0"],
  ["1.2.4", "Captions (Live)", "AA", "2.0"],
  ["1.2.5", "Audio Description (Prerecorded)", "AA", "2.0"],
  ["1.3.1", "Info and Relationships", "A", "2.0"],
  ["1.3.2", "Meaningful Sequence", "A", "2.0"],
  ["1.3.3", "Sensory Characteristics", "A", "2.0"],
  ["1.3.4", "Orientation", "AA", "2.1"],
  ["1.3.5", "Identify Input Purpose", "AA", "2.1"],
  ["1.4.1", "Use of Color", "A", "2.0"],
  ["1.4.2", "Audio Control", "A", "2.0"],
  ["1.4.3", "Contrast (Minimum)", "AA", "2.0"],
  ["1.4.4", "Resize Text", "AA", "2.0"],
  ["1.4.5", "Images of Text", "AA", "2.0"],
  ["1.4.6", "Contrast (Enhanced)", "AAA", "2.0"],
  ["1.4.10", "Reflow", "AA", "2.1"],
  ["1.4.11", "Non-text Contrast", "AA", "2.1"],
  ["1.4.12", "Text Spacing", "AA", "2.1"],
  ["1.4.13", "Content on Hover or Focus", "AA", "2.1"],
  ["2.1.1", "Keyboard", "A", "2.0"],
  ["2.1.2", "No Keyboard Trap", "A", "2.0"],
  ["2.1.4", "Character Key Shortcuts", "A", "2.1"],
  ["2.2.1", "Timing Adjustable", "A", "2.0"],
  ["2.2.2", "Pause, Stop, Hide", "A", "2.0"],
  ["2.3.1", "Three Flashes or Below Threshold", "A", "2.0"],
  ["2.4.1", "Bypass Blocks", "A", "2.0"],
  ["2.4.2", "Page Titled", "A", "2.0"],
  ["2.4.3", "Focus Order", "A", "2.0"],
  ["2.4.4", "Link Purpose (In Context)", "A", "2.0"],
  ["2.4.5", "Multiple Ways", "AA", "2.0"],
  ["2.4.6", "Headings and Labels", "AA", "2.0"],
  ["2.4.7", "Focus Visible", "AA", "2.0"],
  ["2.4.11", "Focus Not Obscured (Minimum)", "AA", "2.2"],
  ["2.5.1", "Pointer Gestures", "A", "2.1"],
  ["2.5.2", "Pointer Cancellation", "A", "2.1"],
  ["2.5.3", "Label in Name", "A", "2.1"],
  ["2.5.4", "Motion Actuation", "A", "2.1"],
  ["2.5.7", "Dragging Movements", "AA", "2.2"],
  ["2.5.8", "Target Size (Minimum)", "AA", "2.2"],
  ["3.1.1", "Language of Page", "A", "2.0"],
  ["3.1.2", "Language of Parts", "AA", "2.0"],
  ["3.2.1", "On Focus", "A", "2.0"],
  ["3.2.2", "On Input", "A", "2.0"],
  ["3.2.3", "Consistent Navigation", "AA", "2.0"],
  ["3.2.4", "Consistent Identification", "AA", "2.0"],
  ["3.3.1", "Error Identification", "A", "2.0"],
  ["3.3.2", "Labels or Instructions", "A", "2.0"],
  ["3.3.3", "Error Suggestion", "AA", "2.0"],
  ["3.3.4", "Error Prevention (Legal, Financial, Data)", "AA", "2.0"],
  ["4.1.1", "Parsing", "A", "2.0"],
  ["4.1.2", "Name, Role, Value", "A", "2.0"],
  ["4.1.3", "Status Messages", "AA", "2.1"],
];

/**
 * W3C Understanding-doc slugs follow the criterion title: lowercased, bracketed
 * qualifiers unwrapped, punctuation dropped, spaces hyphenated. Derived rather
 * than hand-listed because the transformation is mechanical and total across the
 * table above.
 */
function understandingUrl(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[(),]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html`;
}

const BY_NUMBER = new Map<string, WcagCriterion>();
for (const [number, title, level, since] of CRITERIA) {
  BY_NUMBER.set(number, { number, title, level, since, url: understandingUrl(title) });
}

/** `wcag143` -> `1.4.3`. The final group is greedy so `wcag2410` yields 2.4.10. */
const CRITERION_TAG = /^wcag(\d)(\d)(\d+)$/;
/** `wcag2aa`, `wcag21a`, `wcag22aa` -> conformance level only, not a criterion. */
const LEVEL_TAG = /^wcag(?:2|21|22)(a{1,3})$/;

export interface TagAnalysis {
  criteria: WcagCriterion[];
  /** Conformance levels the failing rule belongs to. */
  levels: ConformanceLevel[];
  /**
   * True when axe classes this as its own recommendation rather than a WCAG
   * requirement. Worth separating in a report so nobody reads a best-practice
   * finding as a conformance failure.
   */
  bestPractice: boolean;
}

export function analyzeTags(tags: readonly string[]): TagAnalysis {
  const criteria: WcagCriterion[] = [];
  const levels = new Set<ConformanceLevel>();
  let bestPractice = false;

  for (const tag of tags) {
    if (tag === "best-practice") {
      bestPractice = true;
      continue;
    }

    const criterion = CRITERION_TAG.exec(tag);
    if (criterion) {
      const number = `${criterion[1]}.${criterion[2]}.${criterion[3]}`;
      const known = BY_NUMBER.get(number);
      // Unknown numbers still surface, so a new axe tag degrades to a bare
      // reference instead of vanishing from the report.
      criteria.push(
        known ?? {
          number,
          title: `Success Criterion ${number}`,
          level: "A",
          since: "2.0",
          url: `https://www.w3.org/WAI/WCAG22/Understanding/`,
        },
      );
      continue;
    }

    const level = LEVEL_TAG.exec(tag);
    if (level) levels.add(level[1].toUpperCase() as ConformanceLevel);
  }

  criteria.sort((a, b) => collate(a.number, b.number));
  return {
    criteria,
    levels: Array.from(levels).sort(),
    bestPractice: bestPractice && criteria.length === 0,
  };
}

/** Numeric-segment comparison so 1.4.10 sorts after 1.4.3, not before it. */
function collate(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function criterionByNumber(number: string): WcagCriterion | undefined {
  return BY_NUMBER.get(number);
}
