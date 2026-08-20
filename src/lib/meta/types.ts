/* ---------------------------------------------------------------------------
   Raw extraction

   The extraction pass captures *everything* it finds rather than only the fields
   we currently render - keeping `meta` as an untyped bag means new checks can be
   added without another fetch, and the UI can list unrecognised tags instead of
   silently dropping them.
--------------------------------------------------------------------------- */

export interface RawLink {
  rel: string;
  href: string;
  hreflang: string | null;
  sizes: string | null;
  type: string | null;
  media: string | null;
}

export interface RawJsonLd {
  /** Original text, kept so the UI can show what failed to parse. */
  raw: string;
  /** `@type` values found at the top level or inside `@graph`. */
  types: string[];
  /**
   * `headline` and `description` from the first node that declares them.
   * Mastodon ranks JSON-LD `headline` *above* `og:title`, so these are needed to
   * predict its card rather than being decorative.
   */
  headline: string | null;
  description: string | null;
  error: string | null;
}

export interface RawHeading {
  level: number;
  text: string;
}

export interface RawExtract {
  finalUrl: string;
  lang: string | null;
  dir: string | null;
  charset: string | null;
  title: string | null;
  /** Duplicate `<title>` elements are a real and invisible bug. */
  titleCount: number;
  /**
   * `name` / `property` / `http-equiv` → content. Keys are lowercased. First
   * occurrence wins, matching how crawlers generally behave.
   */
  meta: Record<string, string>;
  /** Keys that appeared more than once, with the count. */
  duplicateMeta: Record<string, number>;
  links: RawLink[];
  jsonLd: RawJsonLd[];
  headings: RawHeading[];
  images: { total: number; missingAlt: number; decorative: number };
  /** Size of the served HTML, used to flag pages with bloated head sections. */
  htmlLength: number;
}

/* ---------------------------------------------------------------------------
   Editable draft

   One flat, serializable shape that the editor mutates and every preview reads.
   Fields are always strings (never null) so inputs stay uncontrolled-free and
   we never hit the "controlled input changed to uncontrolled" warning.
--------------------------------------------------------------------------- */

export type TwitterCard = "summary" | "summary_large_image" | "app" | "player";

export interface MetaDraft {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  keywords: string;
  author: string;
  themeColor: string;

  ogTitle: string;
  ogDescription: string;
  ogType: string;
  ogUrl: string;
  ogSiteName: string;
  ogLocale: string;
  ogImage: string;
  ogImageAlt: string;
  ogImageWidth: string;
  ogImageHeight: string;

  twitterCard: TwitterCard;
  twitterSite: string;
  twitterCreator: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterImageAlt: string;
}

/**
 * What each platform actually renders after applying its own fallback chain
 * (e.g. X falls back to `og:title` when `twitter:title` is absent). Previews
 * consume this, never the draft directly.
 */
export interface ResolvedCard {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  siteName: string;
  url: string;
}

/* ---------------------------------------------------------------------------
   Image probing
--------------------------------------------------------------------------- */

export interface ImageProbe {
  url: string;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  error: string | null;
}

/* ---------------------------------------------------------------------------
   Audit
--------------------------------------------------------------------------- */

export type CheckLevel = "pass" | "warn" | "fail" | "info";

export type CheckGroup =
  | "essentials"
  | "social"
  | "image"
  | "structured-data"
  | "indexing"
  | "icons";

export interface Check {
  id: string;
  group: CheckGroup;
  level: CheckLevel;
  title: string;
  /** What to do about it - never just a restatement of the problem. */
  detail: string;
  /** Which draft field to focus when the user clicks through, if any. */
  field?: keyof MetaDraft;
  /** Points deducted; 0 for pass/info. */
  weight: number;
}

export interface AuditSummary {
  score: number;
  grade: string;
  counts: Record<CheckLevel, number>;
}

/* ---------------------------------------------------------------------------
   The full inspection payload returned by the API and persisted for sharing.
--------------------------------------------------------------------------- */

/**
 * A completed inspection. Deliberately has no id: nothing is persisted, so a
 * result exists only for as long as the tab that requested it.
 */
export interface Inspection {
  requestedUrl: string;
  finalUrl: string;
  /** Document title, kept at the top level for cheap listing/sharing. */
  title: string;
  fetchedAt: string;
  durationMs: number;
  raw: RawExtract;
  /** Values as found on the page - the editor's starting point. */
  draft: MetaDraft;
  probes: ImageProbe[];
  checks: Check[];
  summary: AuditSummary;
}
