"use client";

import { GOOGLE_SERP, truncateToChars, truncateToWidth } from "@/lib/meta/measure";
import { NO_TITLE, type PreviewProps } from "./types";

/**
 * Desktop Google result. Colours and metrics are Google's own, not our tokens -
 * a preview that adopted the app's theme would stop being a preview.
 *
 * The title is clipped by estimated pixel width because that is genuinely how
 * Google truncates it; the snippet is clipped by character count.
 */
export function GooglePreview({ card, host, path, favicon, scheme }: PreviewProps) {
  const dark = scheme === "dark";

  const title = truncateToWidth(
    card.title || NO_TITLE,
    GOOGLE_SERP.titleFontSizePx,
    GOOGLE_SERP.titleMaxWidthPx,
  );
  const description = card.description
    ? truncateToChars(card.description, GOOGLE_SERP.descriptionMaxChars)
    : null;

  return (
    <div
      className="w-full max-w-[600px] p-4"
      style={{
        fontFamily: "arial, sans-serif",
        backgroundColor: dark ? "#202124" : "#ffffff",
      }}
    >
      {/* Site row: favicon, site name, breadcrumb path */}
      <div className="flex items-center gap-3">
        <div
          className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full"
          style={{ backgroundColor: dark ? "#303134" : "#f1f3f4" }}
        >
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element -- favicon comes from the inspected site, an arbitrary remote host
            <img src={favicon} alt="" width={18} height={18} className="size-[18px] object-contain" />
          ) : (
            <span
              className="text-[13px] font-medium"
              style={{ color: dark ? "#9aa0a6" : "#5f6368" }}
              aria-hidden="true"
            >
              {host.charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div
            className="truncate text-[14px] leading-[18px]"
            style={{ color: dark ? "#dadce0" : "#202124" }}
          >
            {card.siteName || host}
          </div>
          <div
            className="truncate text-[12px] leading-[18px]"
            style={{ color: dark ? "#9aa0a6" : "#4d5156" }}
          >
            {path}
          </div>
        </div>
      </div>

      {/* Title - Google's link blue differs per theme */}
      <h4
        className="mt-1 pt-1 text-[20px] leading-[26px]"
        style={{ color: dark ? "#8ab4f8" : "#1a0dab", fontWeight: 400 }}
      >
        <span className="underline decoration-transparent hover:decoration-current">
          {title.text}
        </span>
      </h4>

      {description ? (
        <p
          className="mt-1 text-[14px] leading-[22px]"
          style={{ color: dark ? "#bdc1c6" : "#4d5156" }}
        >
          {description.text}
        </p>
      ) : (
        <p
          className="mt-1 text-[14px] italic leading-[22px]"
          style={{ color: dark ? "#9aa0a6" : "#70757a" }}
        >
          No meta description - Google will generate a snippet from the page text.
        </p>
      )}
    </div>
  );
}
