import type { CheckLevel } from "./meta/types";

/**
 * Presentation mappings kept out of the audit engine so scoring stays free of
 * styling concerns. Values are token references, so both themes are covered.
 */
export function gradeColor(grade: string): string {
  switch (grade[0]) {
    case "A":
      return "var(--grade-a)";
    case "B":
      return "var(--grade-b)";
    case "C":
      return "var(--grade-c)";
    case "D":
      return "var(--grade-d)";
    default:
      return "var(--grade-f)";
  }
}

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export const CHECK_TONE: Record<CheckLevel, Tone> = {
  pass: "success",
  warn: "warning",
  fail: "danger",
  info: "info",
};

export const CHECK_LABEL: Record<CheckLevel, string> = {
  pass: "Pass",
  warn: "Warning",
  fail: "Fail",
  info: "Info",
};
