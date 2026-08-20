import { parseHTML } from "linkedom";
import { absolutize } from "./resolve";
import type { RawExtract, RawHeading, RawJsonLd, RawLink } from "./types";

/**
 * Structural stand-in for the handful of node APIs used below.
 *
 * linkedom's element types aren't the lib.dom ones, and importing them would tie
 * this module to that package's internals. Everything here is read-only anyway.
 */
interface Node {
  localName: string;
  textContent: string | null;
  getAttribute(name: string): string | null;
  closest(selector: string): Node | null;
}

interface MutableNode extends Node {
  getAttributeNames(): string[];
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/**
 * Elements whose attributes get case-normalized. Deliberately a list rather than
 * `*`: SVG and MathML have genuinely case-sensitive attribute names (`viewBox`,
 * `preserveAspectRatio`), and lowercasing those would corrupt them. Nothing here
 * reads an SVG attribute, so restricting the sweep costs nothing.
 */
const READ_ELEMENTS = "html, meta, link, base, title, script, img, h1, h2, h3, h4, h5, h6";

/**
 * Lowercases attribute names, which the HTML parser is supposed to do for us.
 *
 * linkedom preserves the case it found, so `<meta charSet="utf-8">` - what React
 * and Next emit server-side - leaves no `charset` attribute to read, and neither
 * does legacy uppercase markup like `<link REL=canonical HREF=/x>`. Without this,
 * a large share of real pages falsely report a missing charset, canonical, alt
 * text, or `lang`.
 */
function lowercaseAttributes(document: {
  querySelectorAll(selector: string): Iterable<MutableNode>;
}): void {
  for (const el of document.querySelectorAll(READ_ELEMENTS)) {
    for (const name of el.getAttributeNames()) {
      const lower = name.toLowerCase();
      if (lower === name) continue;
      const value = el.getAttribute(name);
      el.removeAttribute(name);
      // A duplicate that already exists in the right case wins, matching the
      // parser's first-attribute-wins behaviour.
      if (value !== null && el.getAttribute(lower) === null) el.setAttribute(lower, value);
    }
  }
}

/** Cap on retained headings - enough to judge document structure. */
const MAX_HEADINGS = 80;

/**
 * Whitespace-collapse, matching how `document.title` and `textContent` reads were
 * normalized when this ran inside a real page.
 */
const flatten = (value: string | null | undefined): string =>
  value ? value.replace(/\s+/g, " ").trim() : "";

/**
 * Nodes inside `<template>` are inert, and `<noscript>` content is what a
 * *non*-scripting client sees. Neither is part of the rendered document, so
 * counting them would inflate the image and heading tallies.
 */
const inert = (el: Node): boolean => el.closest("noscript, template") !== null;

/**
 * Reads every tag a crawler would from a raw HTML document.
 *
 * Parses the HTML as shipped rather than driving a browser, so this sees exactly
 * what a crawler that doesn't execute JavaScript sees - which is the population
 * this tool predicts for. The tradeoff is that tags injected at runtime (via
 * `next/head` on a soft navigation, a tag manager, or an i18n library setting
 * `lang`) are invisible here, the same way they're invisible to those crawlers.
 *
 * `finalUrl` must be the URL *after* redirects: it's the fallback base for
 * resolving relative URLs, and every `absolutize` call downstream depends on it.
 */
export function extractMeta(html: string, finalUrl: string): RawExtract {
  const { document } = parseHTML(html);
  lowercaseAttributes(document as never);

  const meta: Record<string, string> = {};
  const duplicateMeta: Record<string, number> = {};

  for (const el of document.querySelectorAll("meta") as Iterable<Node>) {
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

  // A `<base href>` retargets every relative URL on the page. The browser applied
  // this for us via `el.href`; parsing raw HTML means doing it by hand, and
  // skipping it would silently corrupt canonical and favicon URLs.
  const baseHref = (document.querySelector("base[href]") as Node | null)?.getAttribute(
    "href",
  );
  const base = baseHref ? absolutize(baseHref, finalUrl) || finalUrl : finalUrl;

  const links: RawLink[] = [];
  for (const el of document.querySelectorAll("link[rel]") as Iterable<Node>) {
    const rel = (el.getAttribute("rel") ?? "").trim().toLowerCase();
    const rawHref = el.getAttribute("href");
    if (!rel || !rawHref) continue;
    links.push({
      rel,
      // Resolved here so consumers get the same absolute URL the DOM used to hand
      // back; `absolutize` returns the literal value when it can't be parsed.
      href: absolutize(rawHref, base) || rawHref,
      hreflang: el.getAttribute("hreflang"),
      sizes: el.getAttribute("sizes"),
      type: el.getAttribute("type"),
      media: el.getAttribute("media"),
    });
  }

  const jsonLd: RawJsonLd[] = [];
  for (const el of document.querySelectorAll(
    'script[type="application/ld+json"]',
  ) as Iterable<Node>) {
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

  const headings: RawHeading[] = [];
  for (const el of document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6",
  ) as Iterable<Node>) {
    if (inert(el)) continue;
    const text = flatten(el.textContent);
    if (!text) continue;
    headings.push({ level: Number(el.localName[1]), text: text.slice(0, 200) });
    if (headings.length >= MAX_HEADINGS) break;
  }

  let total = 0;
  let missingAlt = 0;
  let decorative = 0;
  for (const img of document.querySelectorAll("img") as Iterable<Node>) {
    if (inert(img)) continue;
    total++;
    const alt = img.getAttribute("alt");
    if (alt === null) missingAlt++;
    else if (alt.trim() === "") decorative++;
  }

  const charsetEl = document.querySelector("meta[charset]") as Node | null;
  const documentElement = document.documentElement as Node | null;

  /**
   * SVG `<title>` elements are excluded rather than scoping to `head > title`.
   *
   * An unqualified selector matches the `<title>` inside every inline SVG icon,
   * which reports a duplicate-title failure on any page that uses them. Scoping to
   * `head` would fix that but then miss a page whose `<title>` ended up in the
   * body through malformed markup - which browsers still honour.
   */
  const titles = Array.from(document.querySelectorAll("title") as Iterable<Node>).filter(
    (el) => el.closest("svg") === null,
  );

  return {
    finalUrl,
    lang: documentElement?.getAttribute("lang") ?? null,
    dir: documentElement?.getAttribute("dir") ?? null,
    charset: charsetEl?.getAttribute("charset") ?? meta["content-type"] ?? null,
    title: flatten(titles[0]?.textContent) || null,
    titleCount: titles.length,
    meta,
    duplicateMeta,
    links,
    jsonLd,
    headings,
    images: { total, missingAlt, decorative },
    htmlLength: html.length,
  };
}
