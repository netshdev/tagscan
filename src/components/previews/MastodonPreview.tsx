"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/**
 * Mastodon status card.
 *
 * Two behaviours are modelled that no other platform shares: the description is
 * clamped to exactly one line (so it truncates far sooner than elsewhere), and a
 * portrait or square image drops the hero banner for a 120x120 side thumbnail.
 * Title and description resolution happens upstream in `resolveMastodon`, which
 * ranks JSON-LD `headline` above `og:title`.
 */
export function MastodonPreview({ card, host, scheme }: PreviewProps) {
  const dark = scheme === "dark";
  const spec = PLATFORMS.mastodon;

  const colors = dark
    ? { bg: "#1f232b", border: "#3e4451", title: "#ffffff", muted: "#8c8dff", body: "#9baec8" }
    : { bg: "#ffffff", border: "#c0cdd9", title: "#000000", muted: "#606984", body: "#606984" };

  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.ideal);
  const description =
    card.description && spec.descriptionLimit
      ? truncateToChars(card.description, spec.descriptionLimit.ideal)
      : null;

  return (
    <div
      className="w-full max-w-[460px] p-3"
      style={{
        backgroundColor: dark ? "#191b22" : "#f3f5f7",
        fontFamily:
          '"Roboto", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        className="overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
        }}
      >
        <PreviewImage
          src={card.image}
          alt={card.imageAlt}
          ratio={1.91}
          width={434}
          scheme={scheme}
          emptyLabel="No og:image - Mastodon ignores twitter:image"
        />

        <div className="flex flex-col gap-1 px-4 py-3">
          <span className="truncate text-[13px] leading-4" style={{ color: colors.muted }}>
            {host}
          </span>
          <span
            className="line-clamp-2 text-[15px] font-semibold leading-5"
            style={{ color: colors.title }}
          >
            {title.text}
          </span>
          {description ? (
            // Exactly one line: Mastodon's card CSS clamps it there.
            <span className="truncate text-[13px] leading-[18px]" style={{ color: colors.body }}>
              {description.text}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
