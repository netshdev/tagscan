"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/**
 * Slack unfurl: a left rule, the site name with its favicon, a blue title, then
 * the description and image. Slack caps the unfurl image well below full width,
 * so the banner here is deliberately narrower than the Facebook or X cards.
 */
export function SlackPreview({ card, host, favicon, scheme }: PreviewProps) {
  const dark = scheme === "dark";
  const spec = PLATFORMS.slack;

  const colors = dark
    ? { bg: "#1a1d21", rule: "#35373b", text: "#d1d2d3", link: "#1d9bd1", muted: "#ababad" }
    : { bg: "#ffffff", rule: "#dddddd", text: "#1d1c1d", link: "#1264a3", muted: "#616061" };

  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.ideal);
  const description =
    card.description && spec.descriptionLimit
      ? truncateToChars(card.description, spec.descriptionLimit.ideal)
      : null;

  return (
    <div
      className="w-full max-w-[520px] py-1"
      style={{
        backgroundColor: colors.bg,
        fontFamily:
          'Lato, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        className="flex flex-col gap-1.5 pl-3"
        style={{ borderLeft: `4px solid ${colors.rule}` }}
      >
        {/* Attribution row */}
        <div className="flex items-center gap-1.5">
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element -- favicon comes from the inspected site, an arbitrary remote host
            <img src={favicon} alt="" width={16} height={16} className="size-4 rounded-sm object-contain" />
          ) : null}
          <span
            className="truncate text-[15px] font-bold leading-[22px]"
            style={{ color: colors.text }}
          >
            {card.siteName || host}
          </span>
        </div>

        <span
          className="line-clamp-2 text-[15px] font-bold leading-[22px]"
          style={{ color: colors.link }}
        >
          {title.text}
        </span>

        {description ? (
          <span
            className="line-clamp-3 text-[15px] leading-[22px]"
            style={{ color: colors.text }}
          >
            {description.text}
          </span>
        ) : null}

        {card.image ? (
          <div className="mt-1 max-w-[360px] overflow-hidden" style={{ borderRadius: 8 }}>
            <PreviewImage
              src={card.image}
              alt={card.imageAlt}
              ratio={1.91}
              width={360}
              scheme={scheme}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
