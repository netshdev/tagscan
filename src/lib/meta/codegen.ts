import type { MetaDraft } from "./types";

export type TargetId = "html" | "next" | "nuxt" | "svelte" | "astro" | "remix";

export interface Target {
  id: TargetId;
  label: string;
  /** Syntax hint for the code block, and the filename we suggest. */
  language: "html" | "tsx" | "ts" | "svelte" | "astro";
  filename: string;
}

export const TARGETS: ReadonlyArray<Target> = [
  { id: "html", label: "HTML", language: "html", filename: "index.html" },
  { id: "next", label: "Next.js", language: "ts", filename: "app/layout.tsx" },
  { id: "nuxt", label: "Nuxt", language: "ts", filename: "app.vue" },
  { id: "svelte", label: "SvelteKit", language: "svelte", filename: "+page.svelte" },
  { id: "astro", label: "Astro", language: "astro", filename: "Layout.astro" },
  { id: "remix", label: "Remix", language: "ts", filename: "route.tsx" },
];

/* --------------------------------------------------------------------------- */

/** Escapes for an HTML attribute value in double quotes. */
function attr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escapes for a JS double-quoted string literal. */
function js(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/** Field list in the order the tags should appear in <head>. */
function tagPairs(d: MetaDraft): Array<[kind: "name" | "property", key: string, value: string]> {
  const pairs: Array<["name" | "property", string, string]> = [];
  const push = (kind: "name" | "property", key: string, value: string) => {
    if (value.trim()) pairs.push([kind, key, value.trim()]);
  };

  push("name", "description", d.description);
  push("name", "keywords", d.keywords);
  push("name", "author", d.author);
  push("name", "robots", d.robots);
  push("name", "theme-color", d.themeColor);

  push("property", "og:type", d.ogType);
  push("property", "og:url", d.ogUrl);
  push("property", "og:title", d.ogTitle);
  push("property", "og:description", d.ogDescription);
  push("property", "og:site_name", d.ogSiteName);
  push("property", "og:locale", d.ogLocale);
  push("property", "og:image", d.ogImage);
  push("property", "og:image:alt", d.ogImageAlt);
  push("property", "og:image:width", d.ogImageWidth);
  push("property", "og:image:height", d.ogImageHeight);

  push("name", "twitter:card", d.twitterCard);
  push("name", "twitter:site", d.twitterSite);
  push("name", "twitter:creator", d.twitterCreator);
  push("name", "twitter:title", d.twitterTitle);
  push("name", "twitter:description", d.twitterDescription);
  push("name", "twitter:image", d.twitterImage);
  push("name", "twitter:image:alt", d.twitterImageAlt);

  return pairs;
}

/* ---------------------------------------------------------------------------
   Plain HTML
--------------------------------------------------------------------------- */

function generateHtml(d: MetaDraft): string {
  const lines: string[] = ['<meta charset="utf-8" />', '<meta name="viewport" content="width=device-width, initial-scale=1" />'];

  if (d.title) lines.push(`<title>${attr(d.title)}</title>`);
  if (d.canonical) lines.push(`<link rel="canonical" href="${attr(d.canonical)}" />`);

  let lastGroup = "";
  for (const [kind, key, value] of tagPairs(d)) {
    // Blank line between the bare / og: / twitter: blocks for legibility.
    const group = key.startsWith("og:") ? "og" : key.startsWith("twitter:") ? "tw" : "base";
    if (lastGroup && group !== lastGroup) lines.push("");
    lastGroup = group;
    lines.push(`<meta ${kind}="${key}" content="${attr(value)}" />`);
  }

  return lines.join("\n");
}

/* ---------------------------------------------------------------------------
   Next.js - App Router Metadata API
--------------------------------------------------------------------------- */

function generateNext(d: MetaDraft): string {
  const parts: string[] = [];
  const line = (text: string) => parts.push(`  ${text}`);

  if (d.title) line(`title: "${js(d.title)}",`);
  if (d.description) line(`description: "${js(d.description)}",`);
  if (d.keywords) {
    const list = d.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .map((k) => `"${js(k)}"`);
    if (list.length) line(`keywords: [${list.join(", ")}],`);
  }
  if (d.author) line(`authors: [{ name: "${js(d.author)}" }],`);
  if (d.canonical) line(`alternates: { canonical: "${js(d.canonical)}" },`);
  if (d.robots) line(`robots: "${js(d.robots)}",`);

  // Open Graph
  const og: string[] = [];
  if (d.ogTitle) og.push(`    title: "${js(d.ogTitle)}",`);
  if (d.ogDescription) og.push(`    description: "${js(d.ogDescription)}",`);
  if (d.ogUrl) og.push(`    url: "${js(d.ogUrl)}",`);
  if (d.ogSiteName) og.push(`    siteName: "${js(d.ogSiteName)}",`);
  if (d.ogLocale) og.push(`    locale: "${js(d.ogLocale)}",`);
  if (d.ogType) og.push(`    type: "${js(d.ogType)}",`);
  if (d.ogImage) {
    const image: string[] = [`        url: "${js(d.ogImage)}",`];
    if (d.ogImageWidth) image.push(`        width: ${Number(d.ogImageWidth) || 1200},`);
    if (d.ogImageHeight) image.push(`        height: ${Number(d.ogImageHeight) || 630},`);
    if (d.ogImageAlt) image.push(`        alt: "${js(d.ogImageAlt)}",`);
    og.push("    images: [", "      {", ...image, "      },", "    ],");
  }
  if (og.length) {
    line("openGraph: {");
    parts.push(...og);
    line("},");
  }

  // Twitter
  const tw: string[] = [];
  if (d.twitterCard) tw.push(`    card: "${js(d.twitterCard)}",`);
  if (d.twitterSite) tw.push(`    site: "${js(d.twitterSite)}",`);
  if (d.twitterCreator) tw.push(`    creator: "${js(d.twitterCreator)}",`);
  if (d.twitterTitle) tw.push(`    title: "${js(d.twitterTitle)}",`);
  if (d.twitterDescription) tw.push(`    description: "${js(d.twitterDescription)}",`);
  if (d.twitterImage) tw.push(`    images: ["${js(d.twitterImage)}"],`);
  if (tw.length) {
    line("twitter: {");
    parts.push(...tw);
    line("},");
  }

  const needsViewport = Boolean(d.themeColor);
  const imports = needsViewport
    ? 'import type { Metadata, Viewport } from "next";'
    : 'import type { Metadata } from "next";';

  const viewport = needsViewport
    ? `\n\n// themeColor lives on the viewport export, not metadata.\nexport const viewport: Viewport = {\n  themeColor: "${js(d.themeColor)}",\n};`
    : "";

  return `${imports}\n\nexport const metadata: Metadata = {\n${parts.join("\n")}\n};${viewport}`;
}

/* ---------------------------------------------------------------------------
   Nuxt - useSeoMeta
--------------------------------------------------------------------------- */

function generateNuxt(d: MetaDraft): string {
  const entries: string[] = [];
  const push = (key: string, value: string) => {
    if (value.trim()) entries.push(`  ${key}: "${js(value.trim())}",`);
  };

  push("title", d.title);
  push("description", d.description);
  push("keywords", d.keywords);
  push("author", d.author);
  push("robots", d.robots);
  push("themeColor", d.themeColor);

  push("ogType", d.ogType);
  push("ogUrl", d.ogUrl);
  push("ogTitle", d.ogTitle);
  push("ogDescription", d.ogDescription);
  push("ogSiteName", d.ogSiteName);
  push("ogLocale", d.ogLocale);
  push("ogImage", d.ogImage);
  push("ogImageAlt", d.ogImageAlt);
  push("ogImageWidth", d.ogImageWidth);
  push("ogImageHeight", d.ogImageHeight);

  push("twitterCard", d.twitterCard);
  push("twitterSite", d.twitterSite);
  push("twitterCreator", d.twitterCreator);
  push("twitterTitle", d.twitterTitle);
  push("twitterDescription", d.twitterDescription);
  push("twitterImage", d.twitterImage);
  push("twitterImageAlt", d.twitterImageAlt);

  const canonical = d.canonical
    ? `\n\nuseHead({\n  link: [{ rel: "canonical", href: "${js(d.canonical)}" }],\n});`
    : "";

  return `<script setup lang="ts">\nuseSeoMeta({\n${entries.join("\n")}\n});${canonical}\n</script>`;
}

/* ---------------------------------------------------------------------------
   SvelteKit - <svelte:head>
--------------------------------------------------------------------------- */

function generateSvelte(d: MetaDraft): string {
  const lines: string[] = [];
  if (d.title) lines.push(`  <title>${attr(d.title)}</title>`);
  if (d.canonical) lines.push(`  <link rel="canonical" href="${attr(d.canonical)}" />`);
  for (const [kind, key, value] of tagPairs(d)) {
    lines.push(`  <meta ${kind}="${key}" content="${attr(value)}" />`);
  }
  return `<svelte:head>\n${lines.join("\n")}\n</svelte:head>`;
}

/* ---------------------------------------------------------------------------
   Astro
--------------------------------------------------------------------------- */

function generateAstro(d: MetaDraft): string {
  const lines: string[] = [];
  if (d.title) lines.push(`  <title>{title}</title>`);
  if (d.canonical) lines.push(`  <link rel="canonical" href={canonical} />`);
  for (const [kind, key, value] of tagPairs(d)) {
    lines.push(`  <meta ${kind}="${key}" content="${attr(value)}" />`);
  }

  const frontmatter = [
    "---",
    `const title = "${js(d.title)}";`,
    d.canonical ? `const canonical = "${js(d.canonical)}";` : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  return `${frontmatter}\n\n<head>\n${lines.join("\n")}\n</head>`;
}

/* ---------------------------------------------------------------------------
   Remix - meta export
--------------------------------------------------------------------------- */

function generateRemix(d: MetaDraft): string {
  const entries: string[] = [];
  if (d.title) entries.push(`  { title: "${js(d.title)}" },`);
  if (d.canonical) {
    entries.push(`  { tagName: "link", rel: "canonical", href: "${js(d.canonical)}" },`);
  }
  for (const [kind, key, value] of tagPairs(d)) {
    entries.push(`  { ${kind}: "${key}", content: "${js(value)}" },`);
  }

  return `import type { MetaFunction } from "@remix-run/node";\n\nexport const meta: MetaFunction = () => [\n${entries.join("\n")}\n];`;
}

/* --------------------------------------------------------------------------- */

const GENERATORS: Record<TargetId, (draft: MetaDraft) => string> = {
  html: generateHtml,
  next: generateNext,
  nuxt: generateNuxt,
  svelte: generateSvelte,
  astro: generateAstro,
  remix: generateRemix,
};

export function generate(target: TargetId, draft: MetaDraft): string {
  return GENERATORS[target](draft);
}
