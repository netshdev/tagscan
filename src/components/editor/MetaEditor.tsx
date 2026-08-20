"use client";

import type { ReactNode } from "react";
import { SelectField, TextAreaField, TextField, type Limit } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { MetaDraft } from "@/lib/meta/types";

/**
 * Counter limits for the editor.
 *
 * These are necessarily a compromise: one field feeds many consumers, and none of
 * these numbers come from the Open Graph spec, which defines no lengths at all.
 * The per-platform truncation warnings in the audit are the precise answer; these
 * are the at-a-glance target.
 *
 * `ogDescription.ideal` is Facebook's mobile feed cut, the tightest limit that
 * affects a mainstream surface. Its `max` is Bluesky's 200, which is a genuine
 * hard stop - Bluesky's client truncates the string before it is ever stored, so
 * past that point the text cannot be recovered. Consumers range from WhatsApp at
 * ~130 up to Discord, which applies no clamp at all.
 */
const LIMITS = {
  title: { ideal: 60, max: 70 } satisfies Limit,
  description: { ideal: 155, max: 160 } satisfies Limit,
  ogTitle: { ideal: 60, max: 88 } satisfies Limit,
  ogDescription: { ideal: 110, max: 200 } satisfies Limit,
  imageAlt: { ideal: 125, max: 420 } satisfies Limit,
  twitterTitle: { ideal: 60, max: 70 } satisfies Limit,
  // X renders no description; this only matters via Slack and Discord fallback.
  twitterDescription: { ideal: 120, max: 200 } satisfies Limit,
};

const OG_TYPES = [
  { value: "website", label: "website" },
  { value: "article", label: "article" },
  { value: "profile", label: "profile" },
  { value: "book", label: "book" },
  { value: "video.movie", label: "video.movie" },
  { value: "video.other", label: "video.other" },
  { value: "music.song", label: "music.song" },
];

const TWITTER_CARDS = [
  { value: "summary_large_image", label: "summary_large_image - banner" },
  { value: "summary", label: "summary - small thumbnail" },
  { value: "player", label: "player - video or audio" },
  { value: "app", label: "app - mobile app" },
];

interface Props {
  draft: MetaDraft;
  onChange: <K extends keyof MetaDraft>(field: K, value: MetaDraft[K]) => void;
  onReset: () => void;
  /** True once the draft diverges from what was scraped. */
  dirty: boolean;
}

/**
 * A `<details>`-based accordion: native disclosure gives keyboard support, the
 * correct ARIA semantics, and find-in-page for free, none of which a div-based
 * accordion would.
 */
function Section({
  title,
  hint,
  open = false,
  badge,
  children,
}: {
  title: string;
  hint: string;
  open?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group border-b border-border last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-fg">
            {title}
            {badge}
          </span>
          <span className="text-xs text-subtle">{hint}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <div className="flex flex-col gap-4 px-4 pb-5 pt-1">{children}</div>
    </details>
  );
}

export function MetaEditor({ draft, onChange, onReset, dirty }: Props) {
  return (
    <Card as="section">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle>Tags</CardTitle>
          {dirty ? <Badge tone="accent">Edited</Badge> : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!dirty}
          aria-label="Discard edits and restore the scraped tag values"
        >
          Reset
        </Button>
      </CardHeader>

      <CardBody className="p-0">
        <Section
          title="Essentials"
          hint="What Google reads for the search result."
          open
        >
          <TextField
            label="Title"
            name="title"
            value={draft.title}
            onChange={(e) => onChange("title", e.target.value)}
            limit={LIMITS.title}
            placeholder="Page title…"
            autoComplete="off"
            hint="Google truncates by pixel width around 600px, not by character count."
          />
          <TextAreaField
            label="Meta Description"
            name="description"
            value={draft.description}
            onChange={(e) => onChange("description", e.target.value)}
            limit={LIMITS.description}
            placeholder="A sentence or two that earns the click…"
            rows={3}
          />
          <TextField
            label="Canonical URL"
            name="canonical"
            type="url"
            inputMode="url"
            spellCheck={false}
            value={draft.canonical}
            onChange={(e) => onChange("canonical", e.target.value)}
            placeholder="https://example.com/page"
            autoComplete="off"
            hint="Must be absolute. Consolidates ranking signals across parameterised duplicates."
          />
        </Section>

        <Section
          title="Open Graph"
          hint="Read by every platform here except Google - and the only source Facebook, LinkedIn, Mastodon, and Bluesky will use."
          open
        >
          <TextField
            label="og:title"
            name="og:title"
            value={draft.ogTitle}
            onChange={(e) => onChange("ogTitle", e.target.value)}
            limit={LIMITS.ogTitle}
            placeholder="Falls back to the page title…"
            autoComplete="off"
          />
          <TextAreaField
            label="og:description"
            name="og:description"
            value={draft.ogDescription}
            onChange={(e) => onChange("ogDescription", e.target.value)}
            limit={LIMITS.ogDescription}
            placeholder="Written for a feed, not a search result…"
            rows={3}
          />
          <TextField
            label="og:image"
            name="og:image"
            type="url"
            inputMode="url"
            spellCheck={false}
            value={draft.ogImage}
            onChange={(e) => onChange("ogImage", e.target.value)}
            placeholder="https://example.com/og.png"
            autoComplete="off"
            hint="Absolute https URL at 1200×630. Under 500 KB clears every platform's ceiling."
          />
          <TextField
            label="og:image:alt"
            name="og:image:alt"
            value={draft.ogImageAlt}
            onChange={(e) => onChange("ogImageAlt", e.target.value)}
            limit={LIMITS.imageAlt}
            placeholder="Describe the image…"
            autoComplete="off"
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="og:image:width"
              name="og:image:width"
              type="number"
              inputMode="numeric"
              value={draft.ogImageWidth}
              onChange={(e) => onChange("ogImageWidth", e.target.value)}
              placeholder="1200"
              autoComplete="off"
            />
            <TextField
              label="og:image:height"
              name="og:image:height"
              type="number"
              inputMode="numeric"
              value={draft.ogImageHeight}
              onChange={(e) => onChange("ogImageHeight", e.target.value)}
              placeholder="630"
              autoComplete="off"
            />
          </div>

          <TextField
            label="og:url"
            name="og:url"
            type="url"
            inputMode="url"
            spellCheck={false}
            value={draft.ogUrl}
            onChange={(e) => onChange("ogUrl", e.target.value)}
            placeholder="https://example.com/page"
            autoComplete="off"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="og:site_name"
              name="og:site_name"
              value={draft.ogSiteName}
              onChange={(e) => onChange("ogSiteName", e.target.value)}
              placeholder="Example"
              autoComplete="off"
            />
            <SelectField
              label="og:type"
              name="og:type"
              value={draft.ogType || "website"}
              onChange={(e) => onChange("ogType", e.target.value)}
              options={OG_TYPES}
            />
          </div>

          <TextField
            label="og:locale"
            name="og:locale"
            value={draft.ogLocale}
            onChange={(e) => onChange("ogLocale", e.target.value)}
            placeholder="en_US"
            autoComplete="off"
            spellCheck={false}
          />
        </Section>

        <Section title="X (Twitter)" hint="Overrides Open Graph on X only.">
          <SelectField
            label="twitter:card"
            name="twitter:card"
            value={draft.twitterCard}
            onChange={(e) => onChange("twitterCard", e.target.value as MetaDraft["twitterCard"])}
            options={TWITTER_CARDS}
            hint="summary_large_image gets the full-width banner."
          />
          <TextField
            label="twitter:title"
            name="twitter:title"
            value={draft.twitterTitle}
            onChange={(e) => onChange("twitterTitle", e.target.value)}
            limit={LIMITS.twitterTitle}
            placeholder="Falls back to og:title…"
            autoComplete="off"
          />
          <TextAreaField
            label="twitter:description"
            name="twitter:description"
            value={draft.twitterDescription}
            onChange={(e) => onChange("twitterDescription", e.target.value)}
            limit={LIMITS.twitterDescription}
            placeholder="Falls back to og:description…"
            rows={2}
          />
          <TextField
            label="twitter:image"
            name="twitter:image"
            type="url"
            inputMode="url"
            spellCheck={false}
            value={draft.twitterImage}
            onChange={(e) => onChange("twitterImage", e.target.value)}
            placeholder="Falls back to og:image…"
            autoComplete="off"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="twitter:site"
              name="twitter:site"
              value={draft.twitterSite}
              onChange={(e) => onChange("twitterSite", e.target.value)}
              placeholder="@example"
              autoComplete="off"
              spellCheck={false}
            />
            <TextField
              label="twitter:creator"
              name="twitter:creator"
              value={draft.twitterCreator}
              onChange={(e) => onChange("twitterCreator", e.target.value)}
              placeholder="@author"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </Section>

        <Section title="Advanced" hint="Indexing, attribution, and browser chrome.">
          <TextField
            label="robots"
            name="robots"
            value={draft.robots}
            onChange={(e) => onChange("robots", e.target.value)}
            placeholder="index, follow"
            autoComplete="off"
            spellCheck={false}
            hint="noindex removes the page from search entirely - check before shipping."
          />

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <TextField
                label="theme-color"
                name="theme-color"
                value={draft.themeColor}
                onChange={(e) => onChange("themeColor", e.target.value)}
                placeholder="#1a1b21"
                autoComplete="off"
                spellCheck={false}
                hint="Tints mobile browser chrome and Discord's embed rule."
              />
            </div>
            {/* Native picker, kept in sync with the text field both ways. */}
            <label className="mb-6 shrink-0">
              <span className="sr-only">Pick a theme colour</span>
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(draft.themeColor) ? draft.themeColor : "#000000"}
                onChange={(e) => onChange("themeColor", e.target.value)}
                className="size-10 cursor-pointer rounded-lg border border-border bg-surface p-1"
              />
            </label>
          </div>

          <TextField
            label="author"
            name="author"
            value={draft.author}
            onChange={(e) => onChange("author", e.target.value)}
            placeholder="Jane Doe"
            autoComplete="off"
          />
          <TextAreaField
            label="keywords"
            name="keywords"
            value={draft.keywords}
            onChange={(e) => onChange("keywords", e.target.value)}
            placeholder="comma, separated, terms"
            rows={2}
            hint="Google has ignored this since 2009. Harmless, but not worth effort."
          />
        </Section>
      </CardBody>
    </Card>
  );
}
