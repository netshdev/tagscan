"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { PLATFORMS, PLATFORM_ORDER, resolveCard, type PlatformId } from "@/lib/meta/platforms";
import type { MetaDraft, RawExtract } from "@/lib/meta/types";
import { displayHost, displayPath, faviconFrom } from "@/lib/meta/resolve";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { PREVIEWS, PlatformMark } from "./registry";

interface Props {
  draft: MetaDraft;
  raw: RawExtract | null;
  /** Falls back to the draft's own URL fields before any inspection has run. */
  fallbackUrl: string;
  platform: PlatformId;
  onPlatformChange: (platform: PlatformId) => void;
}

const TAB_ITEMS: TabItem[] = PLATFORM_ORDER.map((id) => ({
  value: id,
  label: PLATFORMS[id].label,
  icon: <PlatformMark id={id} size={14} />,
}));

/**
 * Hosts the platform previews. Owns only the chrome scheme; the active platform
 * is lifted so the page can mirror it into the URL and keep views shareable.
 */
export function PreviewStage({
  draft,
  raw,
  fallbackUrl,
  platform,
  onPlatformChange,
}: Props) {
  const [scheme, setScheme] = useState<"light" | "dark">("light");

  const spec = PLATFORMS[platform];
  const Preview = PREVIEWS[platform];

  const url = draft.canonical || draft.ogUrl || fallbackUrl;
  const favicon = useMemo(() => (raw ? faviconFrom(raw) : ""), [raw]);

  // Mastodon reads JSON-LD ahead of og:*, so the first block declaring each
  // field has to travel with the draft into resolution.
  const context = useMemo(() => {
    if (!raw) return {};
    return {
      jsonLdHeadline: raw.jsonLd.find((b) => b.headline)?.headline ?? undefined,
      jsonLdDescription: raw.jsonLd.find((b) => b.description)?.description ?? undefined,
    };
  }, [raw]);

  const card = useMemo(
    () => resolveCard(platform, draft, context),
    [platform, draft, context],
  );

  // Platforms with a single fixed chrome shouldn't offer a theme switch; for
  // those the spec's own scheme wins over the toggle.
  const themeable = spec.scheme === "both";
  const effectiveScheme: "light" | "dark" = spec.scheme === "both" ? scheme : spec.scheme;

  return (
    <Card as="section">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle>Preview</CardTitle>
          <Badge tone="neutral">{spec.label}</Badge>
        </div>

        {themeable ? (
          <div
            role="group"
            aria-label="Preview colour scheme"
            className="flex gap-1 rounded-lg bg-surface-sunken p-0.5"
          >
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={scheme === option}
                onClick={() => setScheme(option)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[0.6875rem] font-medium capitalize",
                  "transition-[background-color,border-color,color] duration-150",
                  scheme === option
                    ? "border-border-strong bg-surface-selected text-fg shadow-xs"
                    : "border-transparent text-muted hover:text-fg",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <Badge tone="info">{spec.scheme === "dark" ? "Always dark" : "Always light"}</Badge>
        )}
      </CardHeader>

      <div className="px-4 pb-4 pt-3">
        <Tabs
          items={TAB_ITEMS}
          value={platform}
          onChange={(value) => onPlatformChange(value as PlatformId)}
          label="Preview platform"
        />
      </div>

      {/*
        The stage is a neutral ground so each card's own background is
        unmistakable, including when it is pure white or black.

        It needs an explicit break from the tab strip above: the tablist uses the
        same sunken token, so touching edges make the picker and the canvas read
        as one grey block. The band of card surface plus this border separates
        "what you're choosing" from "what you're looking at".
      */}
      <CardBody className="flex justify-center border-t border-border bg-surface-sunken p-6">
        <div
          role="tabpanel"
          id={`panel-${platform}`}
          aria-label={`${spec.label} preview`}
          className="animate-fade flex w-full justify-center overflow-hidden rounded-lg shadow-sm"
          key={platform}
        >
          <Preview
            card={card}
            draft={draft}
            host={displayHost(url)}
            path={displayPath(url)}
            favicon={favicon}
            scheme={effectiveScheme}
          />
        </div>
      </CardBody>

      <CardFooter className="flex-col items-start gap-2">
        <p className="text-xs text-muted">
          <span className="font-medium text-fg">Reads:</span>{" "}
          <span className="font-mono text-[0.6875rem]">{spec.reads.join(" → ")}</span>
        </p>
        <p className="text-xs text-subtle">{spec.note}</p>
      </CardFooter>
    </Card>
  );
}
