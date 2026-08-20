/**
 * Google truncates result titles by rendered pixel width, not character count -
 * "Illinois" and "Wamwamwa" are both 8 characters and nowhere near the same
 * width. These helpers estimate width from Arial advance metrics, which is what
 * Google's desktop SERP font is metrically closest to.
 *
 * A static table (rather than canvas measurement) is deliberate: it's synchronous,
 * deterministic, and produces identical numbers on the server and the client. A
 * canvas-on-client / table-on-server split would guarantee a hydration mismatch in
 * the character counters. The tradeoff is that kerning is ignored, which costs
 * well under 1% on Latin text.
 */

/** Arial advance widths in 1/1000 em, grouped by shared width. */
const WIDTH_GROUPS: ReadonlyArray<readonly [number, string]> = [
  [191, "'"],
  [222, "ijl"],
  [260, "|"],
  [278, " !.,/:;Ift[]\\"],
  [333, "()-`r"],
  [334, "{}"],
  [355, '"'],
  [389, "*"],
  [469, "^"],
  [500, "Jcksvxyz"],
  [556, "#$0123456789?_abdeghnopquL"],
  [584, "+<=>~"],
  [611, "FTZ"],
  [667, "&ABEKPSVXY"],
  [722, "CDHNRUw"],
  [778, "GOQ"],
  [833, "Mm"],
  [889, "%"],
  [944, "W"],
  [1015, "@"],
];

/**
 * Non-ASCII glyphs that show up constantly in real titles.
 *
 * The ellipsis matters most: at 1000 it is nearly twice the Latin fallback, and
 * `truncateToWidth` reserves budget for it on every truncation - scoring it at
 * 556 made every truncated title overshoot its budget by ~9px at 20px.
 */
const PUNCTUATION_GROUPS: ReadonlyArray<readonly [number, string]> = [
  [1000, "…-™"], // ellipsis, em dash, trademark
  [737, "®©"], // registered, copyright
  [584, "×±"], // multiplication, plus-minus
  [556, "–€£¥§"], // en dash, euro, pound, yen, section
  [400, "°"], // degree
  [350, "•"], // bullet
  [333, "“”"], // curly double quotes
  [278, " "], // non-breaking space
  [222, "‘’"], // curly single quotes
];

export const ELLIPSIS = "…";

/** Built once at module load rather than per call. */
const CHAR_WIDTH = new Map<string, number>();
for (const [width, chars] of WIDTH_GROUPS) {
  for (const char of chars) CHAR_WIDTH.set(char, width);
}
for (const [width, chars] of PUNCTUATION_GROUPS) {
  for (const char of chars) CHAR_WIDTH.set(char, width);
}

/** Latin-ish default for anything unmapped (accents, emoji, rare punctuation). */
const FALLBACK_WIDTH = 556;

/**
 * Codepoint ranges for full-width glyphs: Hangul Jamo, CJK radicals through
 * kana, CJK ideographs, Hangul syllables, CJK compatibility, and fullwidth
 * forms. Scoring these at the Latin fallback underestimates them by ~45%.
 */
const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x11ff],
  [0x2e80, 0x303f],
  [0x3040, 0x30ff],
  [0x3130, 0x318f],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xac00, 0xd7af],
  [0xf900, 0xfaff],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
];

function isWideChar(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined || code < 0x1100) return false; // fast path for Latin
  for (const [lo, hi] of WIDE_RANGES) {
    if (code >= lo && code <= hi) return true;
  }
  return false;
}

/** Advance width of a single character in 1/1000 em. */
function charWidth(char: string): number {
  if (isWideChar(char)) return 1000;
  return CHAR_WIDTH.get(char) ?? FALLBACK_WIDTH;
}

/** Estimated rendered width of `text` in CSS pixels at `fontSizePx`. */
export function estimateWidth(text: string, fontSizePx: number): number {
  let thousandths = 0;
  for (const char of text) thousandths += charWidth(char);
  return (thousandths / 1000) * fontSizePx;
}

export interface Truncation {
  /** What the platform will actually show, ellipsis included. */
  text: string;
  truncated: boolean;
  /** Character count of the *full* input. Always populated. */
  chars: number;
  /**
   * Estimated rendered width of the full input in CSS pixels, or null when the
   * budget was measured in characters and no font size was involved.
   *
   * Split from `chars` on purpose - these were once one `width` field carrying
   * pixels from one function and a character count from the other.
   */
  widthPx: number | null;
}

/**
 * Truncates to a pixel budget, preferring a word boundary the way real layout
 * does, and appending an ellipsis character (never three periods).
 */
export function truncateToWidth(
  text: string,
  fontSizePx: number,
  maxWidthPx: number,
): Truncation {
  const widthPx = estimateWidth(text, fontSizePx);
  const chars = Array.from(text).length;
  if (widthPx <= maxWidthPx) {
    return { text, truncated: false, chars, widthPx };
  }

  const budget = maxWidthPx - estimateWidth(ELLIPSIS, fontSizePx);
  const glyphs = Array.from(text);

  let used = 0;
  let cut = 0;
  for (let i = 0; i < glyphs.length; i++) {
    const advance = (charWidth(glyphs[i]) / 1000) * fontSizePx;
    if (used + advance > budget) break;
    used += advance;
    cut = i + 1;
  }

  const head = glyphs.slice(0, cut).join("");
  // Back off to the last space so we don't cut mid-word, unless doing so would
  // discard more than a quarter of what actually fits.
  const lastSpace = head.lastIndexOf(" ");
  const clean = lastSpace > head.length * 0.75 ? head.slice(0, lastSpace) : head;

  return { text: `${clean.trimEnd()}${ELLIPSIS}`, truncated: true, chars, widthPx };
}

/**
 * Character-budget truncation, for platforms that genuinely count characters.
 *
 * `suffix` exists because not every platform uses a real ellipsis - Bluesky's
 * client appends three literal periods, and the preview should show what the
 * platform shows rather than what good typography would prefer.
 */
export function truncateToChars(
  text: string,
  maxChars: number,
  suffix: string = ELLIPSIS,
): Truncation {
  const glyphs = Array.from(text);
  if (glyphs.length <= maxChars) {
    return { text, truncated: false, chars: glyphs.length, widthPx: null };
  }

  const head = glyphs.slice(0, Math.max(0, maxChars - 1)).join("");
  const lastSpace = head.lastIndexOf(" ");
  const clean = lastSpace > head.length * 0.75 ? head.slice(0, lastSpace) : head;

  return {
    text: `${clean.trimEnd()}${suffix}`,
    truncated: true,
    chars: glyphs.length,
    widthPx: null,
  };
}

/* ---------------------------------------------------------------------------
   Google SERP geometry.

   Provenance matters here, because none of it is official: Google states
   outright that there is no length limit and that the title link is "truncated
   to fit the device width". Everything below is a calibration constant from
   third-party measurement, not a specification.

   - titleMaxWidthPx 600: Moz (Dr. Pete, May 2016), measuring the desktop title
     *container*. Their mean truncated title of ~63 characters independently
     matches a 62-character title measuring ~590px at 20px Arial, which is why
     this one is trustworthy enough to act on.
   - descriptionMaxChars 160: the widely-used post-2018 figure, after Google
     ended the ~300-character era in May 2018.
   - mobile values: weakest of the set. Mobile titles render at 16px Roboto
     rather than 20px Arial, and published mobile description widths disagree by
     roughly 2x between sources. Treat these as rough.

   Re-verify annually; third-party numbers in this space have churned 10-17%
   over three years.
--------------------------------------------------------------------------- */
export const GOOGLE_SERP = {
  titleFontSizePx: 20,
  titleMaxWidthPx: 600,
  descriptionMaxChars: 160,
  mobileTitleFontSizePx: 16,
  mobileTitleMaxWidthPx: 380,
  mobileDescriptionMaxChars: 120,
} as const;

/** Human-readable byte size. Uses Intl so grouping matches the user's locale. */
export function formatBytes(bytes: number, locale?: string): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(kb)} KB`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(kb / 1024)} MB`;
}
