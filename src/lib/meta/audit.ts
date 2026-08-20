import { GOOGLE_SERP, estimateWidth, formatBytes } from "./measure";
import { PLATFORMS } from "./platforms";
import type {
  AuditSummary,
  Check,
  CheckLevel,
  ImageProbe,
  MetaDraft,
  RawExtract,
} from "./types";

/* ---------------------------------------------------------------------------
   Check authoring helpers. `detail` always states the fix, not just the fault.
--------------------------------------------------------------------------- */

type Draft = Check[];

function add(out: Draft, check: Check) {
  out.push(check);
}

const pass = (
  id: string,
  group: Check["group"],
  title: string,
  detail: string,
): Check => ({ id, group, level: "pass", title, detail, weight: 0 });

const info = (
  id: string,
  group: Check["group"],
  title: string,
  detail: string,
): Check => ({ id, group, level: "info", title, detail, weight: 0 });

/* ---------------------------------------------------------------------------
   Essentials
--------------------------------------------------------------------------- */

function checkEssentials(out: Draft, draft: MetaDraft, raw: RawExtract) {
  // Title
  if (!draft.title) {
    add(out, {
      id: "title-missing",
      group: "essentials",
      level: "fail",
      title: "No page title",
      detail: "Add a <title>. It is the single strongest on-page signal and the clickable line in every search result.",
      field: "title",
      weight: 18,
    });
  } else {
    const width = estimateWidth(draft.title, GOOGLE_SERP.titleFontSizePx);
    const over = width - GOOGLE_SERP.titleMaxWidthPx;
    if (over > 0) {
      add(out, {
        id: "title-too-wide",
        group: "essentials",
        level: "warn",
        title: "Title will be cut off in Google",
        detail: `It renders about ${Math.round(width)}px wide against a ${GOOGLE_SERP.titleMaxWidthPx}px limit - roughly ${Math.ceil(over / 10)} characters too long. Front-load the distinctive words.`,
        field: "title",
        weight: 5,
      });
    } else if (draft.title.length < 15) {
      add(out, {
        id: "title-short",
        group: "essentials",
        level: "warn",
        title: "Title is very short",
        detail: "Under 15 characters leaves ranking signal on the table. Add the page's subject and your brand.",
        field: "title",
        weight: 3,
      });
    } else {
      add(
        out,
        pass(
          "title-ok",
          "essentials",
          "Title fits Google's width",
          `About ${Math.round(width)}px of the ${GOOGLE_SERP.titleMaxWidthPx}px available.`,
        ),
      );
    }
  }

  if (raw.titleCount > 1) {
    add(out, {
      id: "title-duplicate",
      group: "essentials",
      level: "fail",
      title: `${raw.titleCount} <title> elements`,
      detail: "Only the first is used and the rest are dead weight that confuses crawlers. Delete the extras.",
      weight: 8,
    });
  }

  // Description
  if (!draft.description) {
    add(out, {
      id: "description-missing",
      group: "essentials",
      level: "fail",
      title: "No meta description",
      detail: "Without one, Google invents a snippet from page text. Write 120–155 characters that earn the click.",
      field: "description",
      weight: 12,
    });
  } else if (draft.description.length > GOOGLE_SERP.descriptionMaxChars) {
    add(out, {
      id: "description-long",
      group: "essentials",
      level: "warn",
      title: "Meta description will be truncated",
      detail: `${draft.description.length} characters; Google shows about ${GOOGLE_SERP.descriptionMaxChars}. Put the payoff in the first sentence.`,
      field: "description",
      weight: 4,
    });
  } else if (draft.description.length < 70) {
    add(out, {
      id: "description-short",
      group: "essentials",
      level: "warn",
      title: "Meta description is thin",
      detail: `${draft.description.length} characters uses less than half the available snippet. Aim for 120–155.`,
      field: "description",
      weight: 3,
    });
  } else {
    add(
      out,
      pass(
        "description-ok",
        "essentials",
        "Meta description is well sized",
        `${draft.description.length} characters, inside Google's ${GOOGLE_SERP.descriptionMaxChars}-character snippet.`,
      ),
    );
  }

  // Canonical
  if (!draft.canonical) {
    add(out, {
      id: "canonical-missing",
      group: "essentials",
      level: "warn",
      title: "No canonical URL",
      detail: "Add <link rel=\"canonical\"> so query strings and tracking parameters don't split ranking signals across duplicates.",
      field: "canonical",
      weight: 6,
    });
  } else if (!/^https?:\/\//i.test(draft.canonical)) {
    add(out, {
      id: "canonical-relative",
      group: "essentials",
      level: "fail",
      title: "Canonical URL is not absolute",
      detail: "Canonical must be a full absolute URL including the scheme and host, or crawlers ignore it.",
      field: "canonical",
      weight: 7,
    });
  } else {
    add(out, pass("canonical-ok", "essentials", "Canonical URL is set", draft.canonical));
  }

  // Document basics
  if (!raw.lang) {
    add(out, {
      id: "lang-missing",
      group: "essentials",
      level: "fail",
      title: "No lang attribute on <html>",
      detail: 'Add lang="en" (or the right code). Screen readers pick pronunciation from it and search engines use it for targeting.',
      weight: 8,
    });
  } else {
    add(out, pass("lang-ok", "essentials", "Document language declared", `lang="${raw.lang}"`));
  }

  if (!raw.meta.viewport) {
    add(out, {
      id: "viewport-missing",
      group: "essentials",
      level: "fail",
      title: "No viewport meta tag",
      detail: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">, or mobile browsers render at desktop width and zoom out.',
      weight: 10,
    });
  } else if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?\b/i.test(raw.meta.viewport)) {
    add(out, {
      id: "viewport-no-zoom",
      group: "essentials",
      level: "fail",
      title: "Viewport blocks pinch-zoom",
      detail: "Remove user-scalable=no and maximum-scale=1. Blocking zoom fails WCAG 1.4.4 and hurts anyone with low vision.",
      weight: 9,
    });
  } else {
    add(out, pass("viewport-ok", "essentials", "Viewport is configured", raw.meta.viewport));
  }

  if (!raw.charset) {
    add(out, {
      id: "charset-missing",
      group: "essentials",
      level: "warn",
      title: "No charset declaration",
      detail: 'Add <meta charset="utf-8"> as the first element in <head> so the parser never has to guess.',
      weight: 4,
    });
  }

  // Heading structure
  const h1s = raw.headings.filter((h) => h.level === 1);
  if (h1s.length === 0) {
    add(out, {
      id: "h1-missing",
      group: "essentials",
      level: "warn",
      title: "No <h1> on the page",
      detail: "Give the page exactly one <h1> naming its subject - it anchors both the outline and screen-reader navigation.",
      weight: 6,
    });
  } else if (h1s.length > 1) {
    add(out, {
      id: "h1-multiple",
      group: "essentials",
      level: "warn",
      title: `${h1s.length} <h1> elements`,
      detail: "Keep one <h1> per page and demote the rest to <h2>, so the document outline stays unambiguous.",
      weight: 3,
    });
  } else {
    add(out, pass("h1-ok", "essentials", "Exactly one <h1>", h1s[0].text.slice(0, 120)));
  }

  const skipped = firstSkippedHeading(raw);
  if (skipped) {
    add(out, {
      id: "heading-skip",
      group: "essentials",
      level: "warn",
      title: `Heading level jumps from h${skipped.from} to h${skipped.to}`,
      detail: "Don't skip levels - screen-reader users navigate by this hierarchy. Use CSS for size, headings for structure.",
      weight: 3,
    });
  }

  const dupes = Object.entries(raw.duplicateMeta);
  if (dupes.length > 0) {
    add(out, {
      id: "meta-duplicates",
      group: "essentials",
      level: "warn",
      title: `${dupes.length} duplicated meta tag${dupes.length === 1 ? "" : "s"}`,
      detail: `Only the first value counts: ${dupes.map(([k, n]) => `${k} (×${n})`).join(", ")}. Remove the duplicates.`,
      weight: 3,
    });
  }
}

/** Finds the first place the heading outline skips a level. */
function firstSkippedHeading(raw: RawExtract): { from: number; to: number } | null {
  let previous = 0;
  for (const heading of raw.headings) {
    if (previous && heading.level > previous + 1) {
      return { from: previous, to: heading.level };
    }
    previous = heading.level;
  }
  return null;
}

/* ---------------------------------------------------------------------------
   Social markup
--------------------------------------------------------------------------- */

function checkSocial(out: Draft, draft: MetaDraft) {
  const REQUIRED_OG: ReadonlyArray<{
    field: keyof MetaDraft;
    tag: string;
    weight: number;
    fix: string;
  }> = [
    {
      field: "ogTitle",
      tag: "og:title",
      weight: 8,
      fix: "Without it, Facebook and LinkedIn fall back to the <title>, which is usually written for search rather than for a feed.",
    },
    {
      field: "ogDescription",
      tag: "og:description",
      weight: 6,
      fix: "Feeds show roughly 110 characters - write for the scroll, not for the SERP.",
    },
    {
      field: "ogImage",
      tag: "og:image",
      weight: 14,
      fix: "This is the single biggest driver of click-through on shared links. A card without an image is a grey box.",
    },
    {
      field: "ogUrl",
      tag: "og:url",
      weight: 4,
      fix: "Set it to the canonical URL so shares of parameterised links all aggregate to one entry.",
    },
    {
      field: "ogType",
      tag: "og:type",
      weight: 3,
      fix: 'Use "website" for landing pages and "article" for posts - it changes how some platforms lay the card out.',
    },
    {
      field: "ogSiteName",
      tag: "og:site_name",
      weight: 3,
      fix: "Platforms show it above the title as attribution; without it they print the bare hostname.",
    },
  ];

  for (const req of REQUIRED_OG) {
    if (!draft[req.field]) {
      add(out, {
        id: `missing-${req.tag}`,
        group: "social",
        level: req.weight >= 8 ? "fail" : "warn",
        title: `Missing ${req.tag}`,
        detail: req.fix,
        field: req.field,
        weight: req.weight,
      });
    }
  }

  const presentOg = REQUIRED_OG.filter((r) => draft[r.field]).length;
  if (presentOg === REQUIRED_OG.length) {
    add(
      out,
      pass("og-complete", "social", "Open Graph markup is complete", "All six core og:* tags are present."),
    );
  }

  if (!draft.twitterCard) {
    add(out, {
      id: "missing-twitter-card",
      group: "social",
      level: "warn",
      title: "Missing twitter:card",
      detail: 'Add twitter:card="summary_large_image" to get the full-width banner instead of a small thumbnail.',
      field: "twitterCard",
      weight: 5,
    });
  } else if (draft.twitterCard === "summary" && draft.ogImage) {
    add(out, {
      id: "twitter-card-small",
      group: "social",
      level: "warn",
      title: "Using the small X card",
      detail: 'You have an image, so switch twitter:card to "summary_large_image" for a banner that earns far more attention.',
      field: "twitterCard",
      weight: 3,
    });
  }

  if (!draft.ogImageAlt && !draft.twitterImageAlt && draft.ogImage) {
    add(out, {
      id: "og-image-alt-missing",
      group: "social",
      level: "warn",
      title: "Social image has no alt text",
      detail: "Add og:image:alt describing the image. Screen-reader users on X and Facebook get nothing without it.",
      field: "ogImageAlt",
      weight: 4,
    });
  }

  if (!draft.ogLocale) {
    add(
      out,
      info(
        "og-locale-missing",
        "social",
        "No og:locale",
        'Optional, but setting e.g. "en_US" helps platforms pick the right regional formatting.',
      ),
    );
  }

  // Per-platform truncation, computed from the resolved card each one reads.
  for (const spec of Object.values(PLATFORMS)) {
    const isGoogle = spec.id === "google";

    const title = isGoogle ? draft.title : draft.ogTitle || draft.title;
    if (title && title.length > spec.titleLimit.max) {
      add(out, {
        id: `truncate-title-${spec.id}`,
        group: "social",
        level: "warn",
        title: `Title overruns the ${spec.label} card`,
        detail: `${title.length} characters against a ${spec.titleLimit.max}-character display limit. ${spec.note}`,
        field: isGoogle ? "title" : "ogTitle",
        weight: 2,
      });
    }

    // A null limit means the platform shows no description at all, so there is
    // nothing to overrun - warning there would be noise about invisible copy.
    if (!spec.descriptionLimit) continue;

    const description = isGoogle
      ? draft.description
      : draft.ogDescription || draft.description;

    if (description && description.length > spec.descriptionLimit.max) {
      add(out, {
        id: `truncate-description-${spec.id}`,
        group: "social",
        level: "warn",
        title: `Description is cut short on ${spec.label}`,
        detail: `${description.length} characters against a ${spec.descriptionLimit.max}-character display limit - the last ${description.length - spec.descriptionLimit.max} will not be shown. Front-load the point.`,
        field: isGoogle ? "description" : "ogDescription",
        weight: 2,
      });
    }
  }
}

/* ---------------------------------------------------------------------------
   Social image
--------------------------------------------------------------------------- */

/**
 * Image checks that need only the URL string, split out so stateless share links
 * - which have no probe results - can still run them.
 */
function checkImageUrl(out: Draft, draft: MetaDraft) {
  if (!draft.ogImage) return; // already reported as a missing tag

  if (!/^https:\/\//i.test(draft.ogImage)) {
    const overHttp = /^http:\/\//i.test(draft.ogImage);
    add(out, {
      id: "og-image-insecure",
      group: "image",
      level: "fail",
      title: overHttp
        ? "Social image is served over HTTP"
        : "Social image URL is not absolute",
      detail: "Platforms fetch this from their own servers, so it must be an absolute https:// URL. Relative and http URLs are dropped.",
      field: "ogImage",
      weight: 10,
    });
  }

  // Extension-based, unlike the content-type check below, which needs a fetch.
  if (/\.svg(\?|#|$)/i.test(draft.ogImage)) {
    add(out, {
      id: "og-image-svg-url",
      group: "image",
      level: "fail",
      title: "Social image is an SVG",
      detail: "No major platform renders SVG in link previews. Export a PNG, JPEG, or WebP at 1200×630.",
      field: "ogImage",
      weight: 10,
    });
  }
}

function checkImage(out: Draft, draft: MetaDraft, probes: ImageProbe[]) {
  checkImageUrl(out, draft);
  if (!draft.ogImage) return;

  const probe = probes.find((p) => p.url === draft.ogImage);
  if (!probe) return;

  if (!probe.ok) {
    add(out, {
      id: "og-image-unreachable",
      group: "image",
      level: "fail",
      title: "Social image could not be fetched",
      detail: probe.status
        ? `The URL returned HTTP ${probe.status}. Every platform will render a blank card until this resolves.`
        : `${probe.error ?? "The request failed"}. Check the URL is publicly reachable without authentication.`,
      field: "ogImage",
      weight: 14,
    });
    return;
  }

  add(
    out,
    pass(
      "og-image-reachable",
      "image",
      "Social image is reachable",
      [
        probe.width && probe.height ? `${probe.width}×${probe.height}` : null,
        probe.bytes ? formatBytes(probe.bytes) : null,
        probe.contentType,
      ]
        .filter(Boolean)
        .join(" · "),
    ),
  );

  // Dimensions
  if (probe.width && probe.height) {
    const ratio = probe.width / probe.height;
    if (probe.width < 200 || probe.height < 200) {
      add(out, {
        id: "og-image-tiny",
        group: "image",
        level: "fail",
        title: `Social image is only ${probe.width}×${probe.height}`,
        detail: "Facebook and LinkedIn require at least 200×200 and will show no image below that. Use 1200×630.",
        field: "ogImage",
        weight: 10,
      });
    } else if (probe.width < 600) {
      add(out, {
        id: "og-image-small",
        group: "image",
        level: "warn",
        title: `Social image is small (${probe.width}×${probe.height})`,
        detail: "Below about 600px wide it renders as a thumbnail rather than a banner, and looks soft on retina screens. Use 1200×630.",
        field: "ogImage",
        weight: 5,
      });
    }

    // 1.91:1 is the shared target across Facebook, X, LinkedIn, Slack, Discord.
    if (ratio < 1.6 || ratio > 2.2) {
      add(out, {
        id: "og-image-ratio",
        group: "image",
        level: "warn",
        title: `Aspect ratio is ${ratio.toFixed(2)}:1`,
        detail: "Most platforms crop toward 1.91:1 (1200×630). At this ratio your image will be cut top and bottom, or letterboxed.",
        field: "ogImage",
        weight: 4,
      });
    } else if (probe.width >= 1200) {
      add(
        out,
        pass(
          "og-image-dimensions-ok",
          "image",
          "Social image is correctly sized",
          `${probe.width}×${probe.height} at ${ratio.toFixed(2)}:1 matches the 1.91:1 target.`,
        ),
      );
    }

    // Declared dimensions let platforms reserve space on first render.
    const declaredW = Number(draft.ogImageWidth);
    const declaredH = Number(draft.ogImageHeight);
    if (!draft.ogImageWidth || !draft.ogImageHeight) {
      add(out, {
        id: "og-image-dimensions-undeclared",
        group: "image",
        level: "warn",
        title: "og:image:width and og:image:height not declared",
        detail: `Add width ${probe.width} and height ${probe.height}. WhatsApp in particular often renders no thumbnail without them.`,
        field: "ogImageWidth",
        weight: 4,
      });
    } else if (declaredW !== probe.width || declaredH !== probe.height) {
      add(out, {
        id: "og-image-dimensions-wrong",
        group: "image",
        level: "warn",
        title: "Declared image dimensions don't match the file",
        detail: `Tags say ${declaredW}×${declaredH} but the image is ${probe.width}×${probe.height}. Platforms reserve layout from the tags, so cards will jump.`,
        field: "ogImageWidth",
        weight: 4,
      });
    }
  }

  // Weight
  if (probe.bytes) {
    if (probe.bytes > 5 * 1024 * 1024) {
      add(out, {
        id: "og-image-huge",
        group: "image",
        level: "fail",
        title: `Social image is ${formatBytes(probe.bytes)}`,
        detail: "Over LinkedIn's and X's 5 MB ceiling, so those cards will fail outright. Re-export as compressed JPEG or WebP.",
        field: "ogImage",
        weight: 8,
      });
    } else if (probe.bytes > 600 * 1024) {
      add(out, {
        id: "og-image-heavy",
        group: "image",
        level: "warn",
        title: `Social image is ${formatBytes(probe.bytes)}`,
        detail: "Over WhatsApp's documented 600 KB ceiling, so mobile shares will render no thumbnail. Re-export as compressed JPEG or WebP.",
        field: "ogImage",
        weight: 4,
      });
    } else if (probe.bytes > 500 * 1024) {
      add(out, {
        id: "og-image-slack-thumb",
        group: "image",
        level: "warn",
        title: `Social image is ${formatBytes(probe.bytes)}`,
        detail: "Slack caps unfurl thumbnails at 500 KB. Compressing under that keeps the preview reliable across every platform.",
        field: "ogImage",
        weight: 2,
      });
    }
  }

  if (probe.contentType === "image/svg+xml") {
    add(out, {
      id: "og-image-svg",
      group: "image",
      level: "fail",
      title: "Social image is an SVG",
      detail: "No major platform renders SVG in link previews. Export a PNG, JPEG, or WebP at 1200×630.",
      field: "ogImage",
      weight: 10,
    });
  }
}

/* ---------------------------------------------------------------------------
   Structured data, indexing, icons
--------------------------------------------------------------------------- */

function checkStructuredData(out: Draft, raw: RawExtract) {
  if (raw.jsonLd.length === 0) {
    add(out, {
      id: "jsonld-missing",
      group: "structured-data",
      level: "warn",
      title: "No JSON-LD structured data",
      detail: "Add schema.org JSON-LD (Organization, Article, Product, or BreadcrumbList) to become eligible for rich results.",
      weight: 6,
    });
    return;
  }

  const broken = raw.jsonLd.filter((block) => block.error);
  if (broken.length > 0) {
    add(out, {
      id: "jsonld-invalid",
      group: "structured-data",
      level: "fail",
      title: `${broken.length} JSON-LD block${broken.length === 1 ? "" : "s"} failed to parse`,
      detail: `Invalid JSON is ignored entirely, so the markup does nothing. First error: ${broken[0].error}`,
      weight: 8,
    });
  }

  const types = Array.from(new Set(raw.jsonLd.flatMap((b) => b.types)));
  if (types.length > 0) {
    add(
      out,
      pass(
        "jsonld-present",
        "structured-data",
        `Structured data found: ${types.slice(0, 6).join(", ")}`,
        `${raw.jsonLd.length} JSON-LD block${raw.jsonLd.length === 1 ? "" : "s"} parsed successfully.`,
      ),
    );
  } else if (broken.length === 0) {
    add(out, {
      id: "jsonld-untyped",
      group: "structured-data",
      level: "warn",
      title: "JSON-LD has no @type",
      detail: "A block without @type can't map to a schema.org entity and won't produce rich results. Add one.",
      weight: 4,
    });
  }
}

/** Robots directives, which live entirely in the draft. */
function checkRobotsDirectives(out: Draft, draft: MetaDraft) {
  const robots = draft.robots.toLowerCase();

  if (/\bnoindex\b/.test(robots)) {
    add(out, {
      id: "robots-noindex",
      group: "indexing",
      level: "fail",
      title: "This page is set to noindex",
      detail: "Search engines are being told to drop it entirely. If that's unintentional - a staging config shipped to production - remove it now.",
      field: "robots",
      weight: 20,
    });
  } else if (/\bnofollow\b/.test(robots)) {
    add(out, {
      id: "robots-nofollow",
      group: "indexing",
      level: "warn",
      title: "Links on this page are nofollow",
      detail: "Crawlers won't follow any outbound link here, so linked pages get no signal from it. Confirm that's deliberate.",
      field: "robots",
      weight: 6,
    });
  } else {
    add(
      out,
      pass("robots-ok", "indexing", "Page is indexable", robots ? `robots: ${robots}` : "No robots restrictions found."),
    );
  }
}

function checkIndexing(out: Draft, draft: MetaDraft, raw: RawExtract) {
  checkRobotsDirectives(out, draft);

  const alternates = raw.links.filter((l) => l.rel.includes("alternate") && l.hreflang);
  if (alternates.length > 0) {
    const hasXDefault = alternates.some((l) => l.hreflang === "x-default");
    add(
      out,
      hasXDefault
        ? pass(
            "hreflang-ok",
            "indexing",
            `${alternates.length} hreflang alternates`,
            "Includes x-default for unmatched locales.",
          )
        : {
            id: "hreflang-no-default",
            group: "indexing",
            level: "warn",
            title: "hreflang set has no x-default",
            detail: 'Add <link rel="alternate" hreflang="x-default"> so visitors whose locale matches none of your variants land somewhere sensible.',
            weight: 3,
          },
    );
  }
}

function checkIcons(out: Draft, raw: RawExtract) {
  const rels = raw.links.map((l) => l.rel);
  const hasFavicon = rels.some((r) => r.includes("icon") && !r.includes("apple"));
  const hasApple = rels.some((r) => r.includes("apple-touch-icon"));
  const hasManifest = rels.some((r) => r.includes("manifest"));

  if (!hasFavicon) {
    add(out, {
      id: "favicon-missing",
      group: "icons",
      level: "warn",
      title: "No favicon declared",
      detail: 'Add <link rel="icon">. Google shows a favicon beside every mobile result, and browsers fall back to a blank page icon in tabs.',
      weight: 5,
    });
  } else {
    add(out, pass("favicon-ok", "icons", "Favicon declared", "Shown in browser tabs and mobile search results."));
  }

  if (!hasApple) {
    add(out, {
      id: "apple-icon-missing",
      group: "icons",
      level: "warn",
      title: "No apple-touch-icon",
      detail: 'Add a 180×180 <link rel="apple-touch-icon">, or iOS renders a screenshot of the page when someone saves it to their home screen.',
      weight: 3,
    });
  }

  if (!hasManifest) {
    add(
      out,
      info(
        "manifest-missing",
        "icons",
        "No web app manifest",
        "Optional. A manifest.json supplies the install prompt, app name, and icons for installable web apps.",
      ),
    );
  }

  if (!raw.meta["theme-color"]) {
    add(out, {
      id: "theme-color-missing",
      group: "icons",
      level: "warn",
      title: "No theme-color",
      detail: 'Add <meta name="theme-color"> matching your background. It tints mobile browser chrome and colours the accent bar on Discord embeds.',
      field: "themeColor",
      weight: 3,
    });
  }
}

/* ---------------------------------------------------------------------------
   Entry point
--------------------------------------------------------------------------- */

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

/** Tallies and sorts a finished check list. Worst-first, so the list opens on what matters. */
function summarize(checks: Check[]): { checks: Check[]; summary: AuditSummary } {
  const counts: Record<CheckLevel, number> = { pass: 0, warn: 0, fail: 0, info: 0 };
  let penalty = 0;
  for (const check of checks) {
    counts[check.level]++;
    penalty += check.weight;
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  const ORDER: Record<CheckLevel, number> = { fail: 0, warn: 1, info: 2, pass: 3 };
  const sorted = checks
    .slice()
    .sort((a, b) => ORDER[a.level] - ORDER[b.level] || b.weight - a.weight);

  return { checks: sorted, summary: { score, grade: grade(score), counts } };
}

export function runAudit(
  draft: MetaDraft,
  raw: RawExtract,
  probes: ImageProbe[],
): { checks: Check[]; summary: AuditSummary } {
  const checks: Draft = [];
  checkEssentials(checks, draft, raw);
  checkSocial(checks, draft);
  checkImage(checks, draft, probes);
  checkStructuredData(checks, raw);
  checkIndexing(checks, draft, raw);
  checkIcons(checks, raw);
  return summarize(checks);
}

