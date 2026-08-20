/**
 * Client-side file generation.
 *
 * Nothing is stored server-side, so both downloads are built in the browser from
 * the result already in memory. That also makes them instant - no round trip, and
 * no headless browser as the old PDF endpoint needed.
 */

/** Triggers a download without leaving the page, and never leaks the object URL. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can abort the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Filesystem-safe, lowercase, no runs of separators. */
export function safeFilename(host: string, iso: string, extension: string): string {
  const slug = host
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-z0-9.-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `tagscan-${slug || "report"}-${iso.slice(0, 10)}.${extension}`;
}

export function downloadJson(data: unknown, filename: string) {
  saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}

/* ---------------------------------------------------------------------------
   Standalone HTML
--------------------------------------------------------------------------- */

const FONT_URL = /url\((["']?)(https?:\/\/[^)"']+\.(?:woff2?|ttf|otf))\1\)/gi;
const MAX_INLINE_FONT_BYTES = 200 * 1024;
const FONT_MIME: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

const CSS_URL = /url\((\s*["']?)([^)"']+)(["']?\s*)\)/g;

/**
 * Rewrites `url()` references to absolute, resolved against the stylesheet that
 * declared them.
 *
 * `cssText` does *not* return absolute URLs - Next's font references come back as
 * `url("../media/abc.woff2")`, relative to the CSS file. Without this the font
 * inliner matches nothing and the saved file silently falls back to system fonts.
 */
function absolutizeCssUrls(css: string, base: string): string {
  return css.replace(CSS_URL, (full, open: string, ref: string, close: string) => {
    if (/^(?:data:|https?:|#)/i.test(ref)) return full;
    try {
      return `url(${open}${new URL(ref, base).href}${close})`;
    } catch {
      return full;
    }
  });
}

/**
 * Serializes every same-origin stylesheet out of the CSSOM.
 *
 * Reading `cssRules` throws on cross-origin sheets, which are skipped - the app's
 * own Tailwind output is same-origin, and that's what the report needs.
 */
function collectCss(): string {
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      let text = "";
      for (const rule of Array.from(sheet.cssRules)) text += `${rule.cssText}\n`;
      // Each sheet resolves its own relative URLs; an inline <style> has no href
      // of its own, so it resolves against the document.
      css += absolutizeCssUrls(text, sheet.href ?? document.baseURI);
    } catch {
      // Cross-origin stylesheet; nothing we can read or need.
    }
  }
  return css;
}

/** Chunked so a large font can't blow the argument limit on String.fromCharCode. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Embeds webfonts as data URIs so the saved file needs no network at all. */
async function inlineFonts(css: string): Promise<string> {
  const urls = new Set<string>();
  for (const [, , url] of css.matchAll(FONT_URL)) urls.add(url);
  if (urls.size === 0) return css;

  const replacements = await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > MAX_INLINE_FONT_BYTES) return null;
        const extension = (/\.(woff2?|ttf|otf)$/i.exec(url)?.[1] ?? "").toLowerCase();
        const mime = FONT_MIME[extension] ?? "application/octet-stream";
        return [url, `data:${mime};base64,${toBase64(bytes)}`] as const;
      } catch {
        return null;
      }
    }),
  );

  let out = css;
  for (const pair of replacements) {
    if (pair) out = out.split(pair[0]).join(pair[1]);
  }
  return out;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Builds a self-contained HTML document from a rendered element.
 *
 * The shell is written from scratch rather than cloned from the live page, which
 * is what keeps the output clean: no app chrome, no scripts, no preload hints
 * pointing back at this origin, and no `.dark` class - so a saved report always
 * opens in the light palette regardless of the theme it was exported from.
 */
export async function downloadStandaloneHtml(
  element: HTMLElement,
  title: string,
  filename: string,
) {
  const css = await inlineFonts(collectCss());

  /*
   * next/font defines its families as CSS variables on a generated class, and that
   * class sits on <html>. Carrying the live element's classes over is what makes
   * the embedded webfonts actually apply - without it the @font-face rules load
   * but `--font-geist-sans` is undefined and everything falls back to system-ui.
   *
   * `dark` is stripped so a report exported from dark mode still opens light, which
   * is what a printable document wants.
   */
  const htmlClass = document.documentElement.className
    .split(/\s+/)
    .filter((name) => name && name !== "dark")
    .join(" ");

  const html = `<!doctype html>
<html lang="${document.documentElement.lang || "en"}" class="${escapeHtml(htmlClass)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
</head>
<body class="font-sans antialiased">
${element.outerHTML}
</body>
</html>`;

  saveBlob(new Blob([html], { type: "text/html;charset=utf-8" }), filename);
}
