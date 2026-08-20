import type { MetaDraft, ResolvedCard } from "@/lib/meta/types";

export interface PreviewProps {
  /** Values after the platform's own fallback chain has been applied. */
  card: ResolvedCard;
  /** Full draft, for the few platforms that read extra tags (e.g. theme-color). */
  draft: MetaDraft;
  /** Hostname without `www.`, as platforms display it. */
  host: string;
  /** Breadcrumb path, used by the Google result. */
  path: string;
  /** Favicon taken from the page itself, or "" when the page declares none. */
  favicon: string;
  /**
   * Which chrome to render. Only meaningful for platforms with both themes -
   * Discord is always dark and Pinterest always light regardless of this.
   */
  scheme: "light" | "dark";
}

/** Shared fallback when a platform has nothing to show for the title. */
export const NO_TITLE = "Untitled page";
