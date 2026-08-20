import type { MetaDraft, ResolvedCard, TwitterCard } from "./types";

export type PlatformId =
  | "google"
  | "x"
  | "facebook"
  | "linkedin"
  | "slack"
  | "discord"
  | "whatsapp"
  | "telegram"
  | "mastodon"
  | "bluesky"
  | "pinterest";

export interface ImageSpec {
  /** Ratio the platform crops toward, as width / height. */
  ratio: number;
  recommended: { width: number; height: number };
  min: { width: number; height: number };
  /** Hard upload ceiling in bytes, per platform docs. */
  maxBytes: number;
  /** Soft ceiling past which rendering gets unreliable in the wild. */
  warnBytes?: number;
}

export interface Limit {
  /** Soft target: stay under this and nothing is cut on a typical layout. */
  ideal: number;
  /** Where the platform actually truncates. */
  max: number;
}

export interface PlatformSpec {
  id: PlatformId;
  label: string;
  /** Where the platform gets its data, in priority order - shown in the UI. */
  reads: string[];
  titleLimit: Limit;
  /**
   * `null` when the platform renders no description at all - X never has, and
   * LinkedIn and Pinterest drop it in the feed.
   *
   * Nullable rather than "a big number" on purpose: it stops the audit inventing
   * truncation warnings for copy that is never displayed, and makes the previews'
   * omission of a description a type-level fact instead of a code comment.
   *
   * Note that none of these figures come from the Open Graph protocol, which
   * specifies no lengths whatsoever - og:description is only ever defined as
   * "a one to two sentence description". Every number below is a consumer's
   * rendering limit.
   */
  descriptionLimit: Limit | null;
  image: ImageSpec | null;
  /** Previews render in the platform's own chrome, not the app theme. */
  scheme: "light" | "dark" | "both";
  note: string;
}

const MB = 1024 * 1024;

/**
 * Per-platform truncation and image rules, from each vendor's published card
 * documentation. Numbers are display limits (what the user sees) rather than
 * storage limits, because the point is to predict the rendered card.
 */
export const PLATFORMS: Record<PlatformId, PlatformSpec> = {
  google: {
    id: "google",
    label: "Google",
    reads: ["title", "meta description", "link canonical"],
    // Google truncates the title link by pixel width (~600px desktop), so the
    // character figure is indicative only - see estimateWidth for the real check.
    titleLimit: { ideal: 60, max: 70 },
    // Matches GOOGLE_SERP.descriptionMaxChars, which is what the preview uses.
    descriptionLimit: { ideal: 155, max: 160 },
    image: null,
    scheme: "both",
    note: "Truncates by pixel width, not character count. Google also rewrites titles it judges unhelpful.",
  },

  x: {
    id: "x",
    label: "X",
    reads: ["twitter:*", "og:* (fallback)"],
    // From the archived X Cards docs: title 70, description 200, image alt 420.
    // That documentation has since been taken down (developer.x.com now 402s),
    // so these are the last published values rather than current ones.
    titleLimit: { ideal: 60, max: 70 },
    // X displays no description: the Cards docs listed twitter:description as
    // "Not displayed" on iOS and Android, and the web client dropped card text in
    // October 2023. The tag is still worth setting - Slack and Discord read it.
    descriptionLimit: null,
    image: {
      ratio: 1.91,
      recommended: { width: 1200, height: 628 },
      // summary_large_image is 2:1 min 300x157; summary is 1:1 min 144x144.
      min: { width: 300, height: 157 },
      maxBytes: 5 * MB,
    },
    scheme: "both",
    note: "X does not render twitter:description anywhere - it was never shown on mobile, and web dropped card text in 2023. Still set it, though: Slack and Discord read it as a fallback.",
  },

  facebook: {
    id: "facebook",
    label: "Facebook",
    reads: ["og:*"],
    titleLimit: { ideal: 60, max: 88 },
    descriptionLimit: { ideal: 110, max: 300 },
    image: {
      ratio: 1.91,
      recommended: { width: 1200, height: 630 },
      min: { width: 200, height: 200 },
      maxBytes: 8 * MB,
    },
    scheme: "both",
    note: "Ignores twitter:* tags entirely. Feed truncates the description around 110 characters on mobile.",
  },

  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    reads: ["og:*"],
    titleLimit: { ideal: 70, max: 120 },
    // LinkedIn's feed share renders image, title, and domain only - no description.
    descriptionLimit: null,
    image: {
      ratio: 1.91,
      recommended: { width: 1200, height: 627 },
      min: { width: 200, height: 200 },
      maxBytes: 5 * MB,
    },
    scheme: "both",
    note: "Reads only og:* tags and caches aggressively - use the Post Inspector to bust a stale preview.",
  },

  slack: {
    id: "slack",
    label: "Slack",
    reads: ["og:*", "twitter:* (fallback)", "oEmbed"],
    titleLimit: { ideal: 70, max: 160 },
    descriptionLimit: { ideal: 140, max: 300 },
    image: {
      ratio: 1.91,
      recommended: { width: 1200, height: 630 },
      min: { width: 200, height: 200 },
      maxBytes: 5 * MB,
    },
    scheme: "both",
    note: "Images under about 400px wide unfurl as a small right-aligned thumbnail instead of a banner.",
  },

  discord: {
    id: "discord",
    label: "Discord",
    reads: ["og:*", "twitter:*", "theme-color"],
    // Discord publishes no character limits for auto-generated link embeds, and
    // its shipping client applies no line-clamp or ellipsis to embed title or
    // description. The often-quoted 256/4096 figures are the *bot* embed limits
    // for POST /channels/{id}/messages, which don't apply here. These are our own
    // readability targets, generously capped.
    titleLimit: { ideal: 70, max: 300 },
    descriptionLimit: { ideal: 160, max: 600 },
    image: {
      ratio: 1.91,
      // Rendered large images cap at roughly 400x300, so the asset is letterboxed.
      recommended: { width: 1200, height: 630 },
      min: { width: 200, height: 200 },
      maxBytes: 8 * MB,
    },
    // Discord embeds are always dark-chrome regardless of the viewer's theme.
    scheme: "dark",
    note: "One of the few platforms that reads theme-color, using it for the left accent bar - though a pure #ffffff yields no bar at all.",
  },

  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    reads: ["og:*"],
    // Meta's link-preview spec says the description "should be short - 80
    // characters will suffice", and clamps the title to two lines.
    titleLimit: { ideal: 55, max: 65 },
    descriptionLimit: { ideal: 80, max: 130 },
    image: {
      ratio: 1.91,
      recommended: { width: 1200, height: 630 },
      // Spec is >=300px wide with an aspect ratio no wider than 4:1.
      min: { width: 300, height: 200 },
      // 600 KB, per Meta's WhatsApp link-preview documentation. The widely
      // repeated "300 KB image limit" is a conflation: 300 KB is the separate
      // requirement that the <head> appear within the first 300 KB of HTML.
      maxBytes: 600 * 1024,
    },
    scheme: "both",
    note: "Needs og:image under 600 KB, at least 300px wide, and no wider than 4:1. The preview must also resolve within 10 seconds.",
  },

  telegram: {
    id: "telegram",
    label: "Telegram",
    reads: ["og:*"],
    titleLimit: { ideal: 70, max: 160 },
    descriptionLimit: { ideal: 140, max: 300 },
    image: {
      ratio: 1.91,
      recommended: { width: 1200, height: 630 },
      min: { width: 200, height: 200 },
      maxBytes: 5 * MB,
    },
    scheme: "both",
    note: "Caches link previews per-URL for a long time; append a query string to force a refresh.",
  },

  mastodon: {
    id: "mastodon",
    label: "Mastodon",
    reads: ["JSON-LD headline", "og:*", "<title>"],
    // Rendered clamps, read from link_details_extractor.rb and the card CSS:
    // title is one line collapsed and exactly two expanded; description is
    // exactly one line, so it gets cut far earlier than on most platforms.
    titleLimit: { ideal: 70, max: 160 },
    descriptionLimit: { ideal: 90, max: 140 },
    image: {
      ratio: 1.91,
      recommended: { width: 1200, height: 630 },
      // Landscape gets a hero card; portrait or square drops to a 120x120 thumb.
      min: { width: 200, height: 200 },
      maxBytes: 5 * MB,
    },
    scheme: "both",
    note: "Ranks JSON-LD headline above og:title, and reads og:image only - no twitter:image fallback. Caches two weeks per instance with no purge API, and must re-propagate on every federated server independently.",
  },

  bluesky: {
    id: "bluesky",
    label: "Bluesky",
    reads: ["og:*"],
    // Title clamps to 3 lines; description is hard-cut at exactly 200 characters
    // by the posting client before it ever reaches the record.
    titleLimit: { ideal: 70, max: 300 },
    descriptionLimit: { ideal: 150, max: 200 },
    image: {
      ratio: 1.91,
      recommended: { width: 1200, height: 630 },
      min: { width: 200, height: 200 },
      // Not a rejection threshold: the client downloads the image and
      // binary-searches JPEG quality to land under 1,000,000 bytes itself.
      maxBytes: 1_000_000,
    },
    scheme: "both",
    note: "The card is frozen into the post record when it is published. Nothing ever re-scrapes, so fixing these tags will not fix cards that are already posted.",
  },

  pinterest: {
    id: "pinterest",
    label: "Pinterest",
    reads: ["og:*", "schema.org Rich Pins"],
    titleLimit: { ideal: 40, max: 100 },
    // Pinterest stores the description (~800 chars) and uses it for ranking, but
    // never shows it on the pin in the feed.
    descriptionLimit: null,
    image: {
      // Pinterest is the one platform that wants portrait, not landscape.
      ratio: 2 / 3,
      recommended: { width: 1000, height: 1500 },
      min: { width: 300, height: 450 },
      maxBytes: 20 * MB,
    },
    scheme: "light",
    note: "Prefers tall 2:3 images. A 1200×630 banner gets heavily cropped in the feed.",
  },
};

export const PLATFORM_ORDER: readonly PlatformId[] = [
  "google",
  "x",
  "facebook",
  "linkedin",
  "slack",
  "discord",
  "whatsapp",
  "telegram",
  "mastodon",
  "bluesky",
  "pinterest",
];

/* ---------------------------------------------------------------------------
   Fallback resolution

   Each platform has its own precedence chain. Encoding it here (instead of in
   each preview component) keeps the previews dumb and makes the rules testable.
--------------------------------------------------------------------------- */

const firstNonEmpty = (...values: string[]): string => {
  for (const v of values) {
    const trimmed = v?.trim();
    if (trimmed) return trimmed;
  }
  return "";
};

/** Everything X will consider, in order: twitter:* then og:* then bare tags. */
function resolveX(d: MetaDraft): ResolvedCard {
  return {
    title: firstNonEmpty(d.twitterTitle, d.ogTitle, d.title),
    description: firstNonEmpty(d.twitterDescription, d.ogDescription, d.description),
    image: firstNonEmpty(d.twitterImage, d.ogImage),
    imageAlt: firstNonEmpty(d.twitterImageAlt, d.ogImageAlt),
    siteName: firstNonEmpty(d.ogSiteName),
    url: firstNonEmpty(d.ogUrl, d.canonical),
  };
}

/** Facebook, LinkedIn, WhatsApp, Telegram, Pinterest: og:* only, then bare tags. */
function resolveOpenGraph(d: MetaDraft): ResolvedCard {
  return {
    title: firstNonEmpty(d.ogTitle, d.title),
    description: firstNonEmpty(d.ogDescription, d.description),
    image: firstNonEmpty(d.ogImage),
    imageAlt: firstNonEmpty(d.ogImageAlt),
    siteName: firstNonEmpty(d.ogSiteName),
    url: firstNonEmpty(d.ogUrl, d.canonical),
  };
}

/** Slack and Discord read og:* first but will fall back to twitter:*. */
function resolveOpenGraphThenTwitter(d: MetaDraft): ResolvedCard {
  return {
    title: firstNonEmpty(d.ogTitle, d.twitterTitle, d.title),
    description: firstNonEmpty(d.ogDescription, d.twitterDescription, d.description),
    image: firstNonEmpty(d.ogImage, d.twitterImage),
    imageAlt: firstNonEmpty(d.ogImageAlt, d.twitterImageAlt),
    siteName: firstNonEmpty(d.ogSiteName),
    url: firstNonEmpty(d.ogUrl, d.canonical),
  };
}

/** Google uses the bare tags and ignores social markup for the snippet. */
function resolveGoogle(d: MetaDraft): ResolvedCard {
  return {
    title: firstNonEmpty(d.title, d.ogTitle),
    description: firstNonEmpty(d.description, d.ogDescription),
    image: "",
    imageAlt: "",
    siteName: firstNonEmpty(d.ogSiteName),
    url: firstNonEmpty(d.canonical, d.ogUrl),
  };
}

/**
 * Mastodon is the one platform that ranks structured data above Open Graph:
 * `link_details_extractor.rb` reads JSON-LD `headline` before `og:title`, and
 * JSON-LD `description` before `og:description`. Its image comes from `og:image`
 * alone - there is no `twitter:image` fallback.
 */
function resolveMastodon(d: MetaDraft, context: ResolveContext): ResolvedCard {
  return {
    title: firstNonEmpty(context.jsonLdHeadline ?? "", d.ogTitle, d.title),
    description: firstNonEmpty(
      context.jsonLdDescription ?? "",
      d.ogDescription,
      d.description,
    ),
    image: firstNonEmpty(d.ogImage),
    imageAlt: firstNonEmpty(d.ogImageAlt),
    siteName: firstNonEmpty(d.ogSiteName),
    url: firstNonEmpty(d.ogUrl, d.canonical),
  };
}

/**
 * Extra page facts a few platforms read that aren't meta tags. Optional so
 * callers without an inspection (the empty landing state) still work.
 */
export interface ResolveContext {
  jsonLdHeadline?: string;
  jsonLdDescription?: string;
}

export function resolveCard(
  platform: PlatformId,
  draft: MetaDraft,
  context: ResolveContext = {},
): ResolvedCard {
  switch (platform) {
    case "google":
      return resolveGoogle(draft);
    case "x":
      return resolveX(draft);
    case "slack":
    case "discord":
      return resolveOpenGraphThenTwitter(draft);
    case "mastodon":
      return resolveMastodon(draft, context);
    default:
      return resolveOpenGraph(draft);
  }
}

/** X renders a square thumbnail for `summary` and a banner for the large card. */
export function xCardRatio(card: TwitterCard): number {
  return card === "summary_large_image" ? 1.91 : 1;
}
