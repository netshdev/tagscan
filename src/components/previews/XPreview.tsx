"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/**
 * X link card. `summary_large_image` is a stacked banner; `summary` is a small
 * square thumbnail beside the text - a genuinely different layout, not just a
 * different image size, which is why the card type is worth previewing.
 */
export function XPreview({ card, draft, host, scheme }: PreviewProps) {
  const dark = scheme === "dark";
  const large = draft.twitterCard !== "summary";
  const spec = PLATFORMS.x;

  const colors = dark
    ? { bg: "#000000", border: "#2f3336", text: "#e7e9ea", muted: "#71767b" }
    : { bg: "#ffffff", border: "#cfd9de", text: "#0f1419", muted: "#536471" };

  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.max);

  /**
   * No description is rendered, deliberately.
   *
   * X has never displayed `twitter:description` on iOS or Android - the Cards
   * documentation listed it as "Not displayed" for both - and the web client
   * stopped showing card text in October 2023. Drawing it here would make the
   * preview optimistic about copy that no X user will ever see.
   */
  const text = (
    <div className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2.5">
      <span className="truncate text-[13px] leading-4" style={{ color: colors.muted }}>
        {host}
      </span>
      <span className="line-clamp-2 text-[15px] leading-5" style={{ color: colors.text }}>
        {title.text}
      </span>
    </div>
  );

  return (
    <div
      className="w-full max-w-[440px] overflow-hidden"
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {large ? (
        <>
          <PreviewImage
            src={card.image}
            alt={card.imageAlt}
            ratio={1.91}
            width={438}
            scheme={scheme}
            emptyLabel="No twitter:image or og:image"
          />
          <div style={{ borderTop: `1px solid ${colors.border}` }}>{text}</div>
        </>
      ) : (
        <div className="flex">
          <div
            className="w-[130px] shrink-0"
            style={{ borderRight: `1px solid ${colors.border}` }}
          >
            <PreviewImage
              src={card.image}
              alt={card.imageAlt}
              ratio={1}
              width={130}
              scheme={scheme}
              emptyLabel="No image"
            />
          </div>
          {text}
        </div>
      )}
    </div>
  );
}
