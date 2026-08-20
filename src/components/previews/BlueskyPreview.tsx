"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/** Bluesky's client cuts the description at exactly 200 characters plus "...". */
const BSKY_DESCRIPTION_CHARS = 200;
const BSKY_SUFFIX = "...";

/**
 * Bluesky external embed, at its real feed geometry: a 515px card with a 270px
 * hero, title clamped to three lines and description to two.
 *
 * The important thing this preview communicates is in the footnote rather than
 * the pixels - the card is snapshotted into the post record at publish time, so
 * unlike every other platform here, there is no cache to bust and no way to
 * correct a card that has already been posted.
 */
export function BlueskyPreview({ card, host, scheme }: PreviewProps) {
  const dark = scheme === "dark";
  const spec = PLATFORMS.bluesky;

  const colors = dark
    ? { bg: "#161e27", border: "#2e4052", title: "#f1f3f5", muted: "#8c9eb0" }
    : { bg: "#ffffff", border: "#d4dbe2", title: "#0b0f14", muted: "#42576c" };

  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.ideal);
  const description = card.description
    ? truncateToChars(card.description, BSKY_DESCRIPTION_CHARS, BSKY_SUFFIX)
    : null;

  return (
    <div
      className="w-full max-w-[540px] p-3"
      style={{
        backgroundColor: dark ? "#0b0f14" : "#f7f9fa",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        className="overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
        }}
      >
        <PreviewImage
          src={card.image}
          alt={card.imageAlt}
          ratio={1.905}
          width={513}
          scheme={scheme}
          emptyLabel="No og:image"
        />

        <div className="flex flex-col gap-1 px-3 py-2.5">
          <span
            className="line-clamp-3 text-[15px] font-semibold leading-5"
            style={{ color: colors.title }}
          >
            {title.text}
          </span>
          {description ? (
            <span
              className="line-clamp-2 text-[14px] leading-[19px]"
              style={{ color: colors.muted }}
            >
              {description.text}
            </span>
          ) : null}
        </div>

        <div
          className="px-3 py-2"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          <span className="truncate text-[13px] leading-4" style={{ color: colors.muted }}>
            {host}
          </span>
        </div>
      </div>
    </div>
  );
}
