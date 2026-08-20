import type { MetaDraft, RawExtract, TwitterCard } from "./types";

const TWITTER_CARDS: ReadonlySet<string> = new Set([
  "summary",
  "summary_large_image",
  "app",
  "player",
]);

/** Resolves a possibly-relative URL against the page, dropping anything invalid. */
export function absolutize(value: string | undefined, base: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return trimmed; // keep it visible so the audit can flag it
  }
}

/** Collapses runs of whitespace - copied straight from HTML, values are messy. */
const tidy = (value: string | undefined): string =>
  value ? value.replace(/\s+/g, " ").trim() : "";

/**
 * Folds the raw tag bag into the flat editable draft. Every field is a string so
 * the editor's inputs stay controlled from the first render.
 *
 * Only *literal* tag values land here - no cross-platform fallbacks are applied,
 * because the editor needs to show which tags genuinely exist. Fallbacks are a
 * per-platform read concern, handled by `resolveCard`.
 */
export function toDraft(raw: RawExtract): MetaDraft {
  const m = raw.meta;
  const base = raw.finalUrl;

  const canonical = raw.links.find((l) => l.rel.split(/\s+/).includes("canonical"));

  const card = tidy(m["twitter:card"]).toLowerCase();

  return {
    title: tidy(raw.title ?? undefined),
    description: tidy(m.description),
    canonical: canonical ? absolutize(canonical.href, base) : "",
    robots: tidy(m.robots),
    keywords: tidy(m.keywords),
    author: tidy(m.author),
    themeColor: tidy(m["theme-color"]),

    ogTitle: tidy(m["og:title"]),
    ogDescription: tidy(m["og:description"]),
    ogType: tidy(m["og:type"]),
    ogUrl: absolutize(m["og:url"], base),
    ogSiteName: tidy(m["og:site_name"]),
    ogLocale: tidy(m["og:locale"]),
    ogImage: absolutize(m["og:image"] ?? m["og:image:secure_url"] ?? m["og:image:url"], base),
    ogImageAlt: tidy(m["og:image:alt"]),
    ogImageWidth: tidy(m["og:image:width"]),
    ogImageHeight: tidy(m["og:image:height"]),

    twitterCard: (TWITTER_CARDS.has(card) ? card : "summary_large_image") as TwitterCard,
    twitterSite: tidy(m["twitter:site"]),
    twitterCreator: tidy(m["twitter:creator"]),
    twitterTitle: tidy(m["twitter:title"]),
    twitterDescription: tidy(m["twitter:description"]),
    twitterImage: absolutize(m["twitter:image"] ?? m["twitter:image:src"], base),
    twitterImageAlt: tidy(m["twitter:image:alt"]),
  };
}

/** Every image URL a platform might fetch, deduped, for probing. */
export function imageUrls(draft: MetaDraft): string[] {
  const urls = new Set<string>();
  if (draft.ogImage) urls.add(draft.ogImage);
  if (draft.twitterImage) urls.add(draft.twitterImage);
  return Array.from(urls);
}

/**
 * Best favicon declared by the page, for the preview cards that show one.
 * Prefers a real `rel="icon"` over an Apple touch icon, and the largest declared
 * size within that, since previews render it at 16–18px on retina.
 */
export function faviconFrom(raw: RawExtract): string {
  const scored = raw.links
    .filter((link) => {
      const rels = link.rel.split(/\s+/);
      return rels.some((r) => r === "icon" || r === "shortcut" || r === "apple-touch-icon");
    })
    .map((link) => {
      const rels = link.rel.split(/\s+/);
      const isApple = rels.includes("apple-touch-icon");
      // "48x48" or "any"; treat "any" (SVG) as large since it scales cleanly.
      const declared = link.sizes?.toLowerCase() ?? "";
      const px = declared === "any" ? 512 : Number(declared.split("x")[0]) || 0;
      return { href: link.href, rank: (isApple ? 0 : 1000) + px };
    })
    .sort((a, b) => b.rank - a.rank);

  return scored[0] ? absolutize(scored[0].href, raw.finalUrl) : "";
}

/** Host without the `www.` prefix - what preview cards actually display. */
export function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Breadcrumb Google shows beneath the site name, e.g. `https://example.com › blog`.
 *
 * The scheme is included deliberately: the line above it already shows the bare
 * host as the site name whenever og:site_name is absent, and without the scheme
 * the two lines would render identically on any root URL.
 */
export function displayPath(url: string): string {
  try {
    const parsed = new URL(url);
    const origin = `${parsed.protocol}//${parsed.host.replace(/^www\./, "")}`;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return origin;
    return [origin, ...segments.slice(0, 3)].join(" › ");
  } catch {
    return url;
  }
}

/** An empty draft, used as the starting point before any URL is inspected. */
export function emptyDraft(): MetaDraft {
  return {
    title: "",
    description: "",
    canonical: "",
    robots: "",
    keywords: "",
    author: "",
    themeColor: "",
    ogTitle: "",
    ogDescription: "",
    ogType: "website",
    ogUrl: "",
    ogSiteName: "",
    ogLocale: "",
    ogImage: "",
    ogImageAlt: "",
    ogImageWidth: "",
    ogImageHeight: "",
    twitterCard: "summary_large_image",
    twitterSite: "",
    twitterCreator: "",
    twitterTitle: "",
    twitterDescription: "",
    twitterImage: "",
    twitterImageAlt: "",
  };
}
