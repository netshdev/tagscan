/**
 * The TagScan mark, as data rather than markup.
 *
 * The same magnifying glass appears in the header (`SiteHeader`), as the favicon
 * (`app/icon.svg`), as the iOS icon, and on the social card. Everything except the
 * header renders through `markSvg` here so the geometry can't drift between them.
 *
 * `app/icon.svg` is a static file and therefore the one hand-maintained copy -
 * it's a build-time asset with no chance to call a function. Keep it in step.
 */

/**
 * `--accent` from globals.css, resolved to hex.
 *
 * The token is `oklch(54% 0.208 268)`, which neither an SVG favicon nor Satori can
 * be relied on to parse, and a CSS variable means nothing in either context.
 */
export const ACCENT = "#3d5ee5";

/** `--on-accent`: the near-white the glass is drawn in. */
export const ON_ACCENT = "#fcfcfc";

/** `--bg` in the dark theme, used as the social card's background. */
export const CARD_BG = "#1a1b21";

interface MarkOptions {
  /** Edge length of the square. */
  size: number;
  /**
   * Corner radius as a fraction of `size`. Defaults to the header's ratio
   * (`rounded-md` on a 24px box = 6/24). Pass 0 for iOS, which applies its own
   * mask and would otherwise round an already-rounded corner.
   */
  radius?: number;
  background?: string;
}

/**
 * The mark as a standalone SVG document.
 *
 * Returned as a string so it can be handed to Satori as an `<img src>` data URI:
 * Satori's own inline-SVG support is partial, but a data URI is rasterized by
 * resvg, which renders strokes and rounded joins properly.
 *
 * Geometry is expressed on a 32-unit grid and scaled, so the stroke weight stays
 * proportional at every size instead of vanishing on the favicon.
 */
export function markSvg({ size, radius = 0.25, background = ACCENT }: MarkOptions): string {
  const r = (radius * 32).toFixed(2);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">`,
    `<rect width="32" height="32" rx="${r}" fill="${background}"/>`,
    `<g fill="none" stroke="${ON_ACCENT}" stroke-width="3.2" stroke-linecap="round">`,
    `<circle cx="13.8" cy="13.8" r="7.6"/>`,
    `<path d="M19.2 19.2 L25 25"/>`,
    `</g>`,
    `</svg>`,
  ].join("");
}

/** Base64 data URI, which is what Satori's `<img src>` accepts. */
export function markDataUri(options: MarkOptions): string {
  const encoded = Buffer.from(markSvg(options), "utf8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}
