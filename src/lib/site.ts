/**
 * One source of truth for the site's own identity.
 *
 * The metadata export, `robots.ts`, `sitemap.ts`, `manifest.ts`, and the generated
 * OG images all need the same name, copy, and origin. Duplicating any of it means
 * the day someone edits the tagline, the social card keeps the old one.
 *
 * The copy lengths here are load-bearing, not incidental - see the comments on
 * each. This app audits meta tags for a living, so it should pass its own audit.
 */

export const SITE_NAME = "TagScan";

/**
 * 46 characters and ~430px at Google's 20px render.
 *
 * Two constraints: 70 characters (Google and X both truncate there) and 600px of
 * estimated width, which is the tighter one. A `|` separator is deliberate - the
 * width table charges a hyphen 1000 units against a pipe's 260, so `-` would cost
 * 15px more for the same glyph.
 */
export const SITE_TITLE = "TagScan | Preview, Edit & Audit Your Meta Tags";

/**
 * 125 characters, which threads the needle between two opposite limits: Google
 * wants at least 70 before it calls a description thin, and WhatsApp renders only
 * 130. Anything longer gets visibly cut on the tightest platform this tool checks.
 */
export const SITE_DESCRIPTION =
  "See how your link looks on Google, X, Facebook, Slack and Discord before you post it. Edit any tag live, then copy the code.";

/** Describes the card image itself, not the product - screen readers get this. */
export const OG_IMAGE_ALT =
  "TagScan - preview, edit and audit the meta tags behind your link previews";

/** `og:locale` form (underscore), not the `<html lang>` form (hyphen). */
export const SITE_LOCALE = "en_US";

/**
 * Absolute origin for every generated URL.
 *
 * Unlike a bare `metadataBase`, this always resolves: `robots.ts` and `sitemap.ts`
 * must emit absolute URLs, and an `og:image` has to be absolute and `https` for a
 * crawler on someone else's infrastructure to fetch it at all.
 *
 * Order matters - an explicit env var wins so a custom domain can override the
 * `*.vercel.app` host, which is what Vercel reports even when a domain is attached.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);

  // Local dev: pinning this keeps generated URLs absolute (and silences Next's
  // metadataBase warning) instead of leaving og:image relative and unfetchable.
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}
