import type { RawMetrics } from "./types";

/**
 * Runs entirely inside the page via `page.evaluate`, so it must stay
 * self-contained: no imports, no closure over module scope, DOM APIs only.
 *
 * Aggregates computed-style stats across every rendered element, which is why
 * the result survives Tailwind, CSS-in-JS, and hashed class names - we read what
 * the browser actually resolved rather than trying to parse stylesheets.
 */
export function collectMetrics(): RawMetrics {
  const bump = (m: Record<string, number>, k: string) => {
    if (!k) return;
    m[k] = (m[k] ?? 0) + 1;
  };

  const textColors: Record<string, number> = {};
  const bgColors: Record<string, number> = {};
  const fontSizes: Record<string, number> = {};
  const fontFamilies: Record<string, number> = {};
  const fontWeights: Record<string, number> = {};
  const spacings: Record<string, number> = {};
  const radii: Record<string, number> = {};

  const transparent = new Set(["rgba(0, 0, 0, 0)", "transparent", ""]);
  const els = Array.from(document.body.querySelectorAll<HTMLElement>("*"));
  let elementCount = 0;

  for (const el of els) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue; // skip invisible
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    elementCount++;

    // Leaf text nodes only: counting a wrapper's inherited color would multiply
    // every value by the depth of the tree.
    const hasText = (el.textContent ?? "").trim().length > 0 && el.children.length === 0;
    if (hasText) {
      bump(textColors, cs.color);
      bump(fontSizes, cs.fontSize);
      bump(fontFamilies, cs.fontFamily.split(",")[0].replace(/["']/g, "").trim());
      bump(fontWeights, cs.fontWeight);
    }
    if (!transparent.has(cs.backgroundColor)) bump(bgColors, cs.backgroundColor);

    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      for (const box of ["margin", "padding"] as const) {
        const v = parseFloat(cs[`${box}${side}` as keyof CSSStyleDeclaration] as string);
        if (v > 0) bump(spacings, String(Math.round(v)));
      }
    }
    const r = parseFloat(cs.borderTopLeftRadius);
    if (r > 0) bump(radii, String(Math.round(r)));
  }

  return {
    elementCount,
    textColors,
    bgColors,
    fontSizes,
    fontFamilies,
    fontWeights,
    spacings,
    radii,
  };
}
