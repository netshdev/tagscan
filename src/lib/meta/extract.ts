import type { RawExtract, RawJsonLd, RawLink } from "./types";

/**
 * Serialized into the page by Playwright's `page.evaluate`, so it must be a
 * self-contained function expression: no imports, no closure over module scope,
 * and only DOM APIs inside.
 */
export function extractMeta(): RawExtract {
  const meta: Record<string, string> = {};
  const duplicateMeta: Record<string, number> = {};

  for (const el of Array.from(document.querySelectorAll("meta"))) {
    // `property` is Open Graph, `name` is nearly everything else, and
    // `http-equiv` carries things like content-language.
    const key = (
      el.getAttribute("property") ??
      el.getAttribute("name") ??
      el.getAttribute("http-equiv") ??
      ""
    )
      .trim()
      .toLowerCase();
    if (!key) continue;

    const content = (el.getAttribute("content") ?? "").trim();
    if (!content) continue;

    if (key in meta) {
      duplicateMeta[key] = (duplicateMeta[key] ?? 1) + 1;
      continue; // first value wins, mirroring crawler behaviour
    }
    meta[key] = content;
  }

  const links: RawLink[] = [];
  for (const el of Array.from(document.querySelectorAll("link[rel]"))) {
    const rel = (el.getAttribute("rel") ?? "").trim().toLowerCase();
    const rawHref = el.getAttribute("href");
    if (!rel || !rawHref) continue;
    // `el.href` resolves against <base>/document URL; fall back to the literal
    // attribute for rels the DOM doesn't expose as a URL.
    const href = (el as HTMLLinkElement).href || rawHref;
    links.push({
      rel,
      href,
      hreflang: el.getAttribute("hreflang"),
      sizes: el.getAttribute("sizes"),
      type: el.getAttribute("type"),
      media: el.getAttribute("media"),
    });
  }

  const jsonLd: RawJsonLd[] = [];
  for (const el of Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  )) {
    const raw = (el.textContent ?? "").trim();
    if (!raw) continue;

    let types: string[] = [];
    let headline: string | null = null;
    let description: string | null = null;
    let error: string | null = null;
    try {
      const parsed: unknown = JSON.parse(raw);
      // Schema.org payloads arrive as a single node, an array of nodes, or a
      // node wrapping an @graph array. Flatten all three before reading @type.
      const seed = Array.isArray(parsed) ? parsed : [parsed];
      const nodes: unknown[] = [];
      for (const node of seed) {
        nodes.push(node);
        const graph = (node as { "@graph"?: unknown })?.["@graph"];
        if (Array.isArray(graph)) nodes.push(...graph);
      }
      for (const node of nodes) {
        const record = node as Record<string, unknown> | null;
        const t = record?.["@type"];
        if (typeof t === "string") types.push(t);
        else if (Array.isArray(t)) {
          for (const one of t) if (typeof one === "string") types.push(one);
        }
        // First node that declares each field wins, matching how consumers read it.
        if (!headline && typeof record?.headline === "string") {
          headline = record.headline.trim() || null;
        }
        if (!description && typeof record?.description === "string") {
          description = record.description.trim() || null;
        }
      }
      types = Array.from(new Set(types));
    } catch (err) {
      error = err instanceof Error ? err.message : "Invalid JSON";
    }

    jsonLd.push({ raw: raw.slice(0, 4000), types, headline, description, error });
  }

  const headings: RawHeadingLocal[] = [];
  for (const el of Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))) {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    headings.push({ level: Number(el.tagName[1]), text: text.slice(0, 200) });
    if (headings.length >= 80) break; // enough to judge structure
  }

  let total = 0;
  let missingAlt = 0;
  let decorative = 0;
  for (const img of Array.from(document.querySelectorAll("img"))) {
    total++;
    const alt = img.getAttribute("alt");
    if (alt === null) missingAlt++;
    else if (alt.trim() === "") decorative++;
  }

  const charsetEl = document.querySelector("meta[charset]");

  return {
    finalUrl: location.href,
    lang: document.documentElement.getAttribute("lang"),
    dir: document.documentElement.getAttribute("dir"),
    charset: charsetEl?.getAttribute("charset") ?? meta["content-type"] ?? null,
    title: document.title || null,
    titleCount: document.querySelectorAll("title").length,
    meta,
    duplicateMeta,
    links,
    jsonLd,
    headings,
    images: { total, missingAlt, decorative },
    htmlLength: document.documentElement.outerHTML.length,
  };
}

/** Local mirror of RawHeading - `extractMeta` can't reference imported types at runtime. */
interface RawHeadingLocal {
  level: number;
  text: string;
}
