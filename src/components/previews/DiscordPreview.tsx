"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/** Discord's default embed rule when the page declares no theme-color. */
const DEFAULT_RULE = "#4f545c";
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Discord embed. Always dark chrome - Discord does not restyle embeds for light
 * mode - and it is one of the only platforms that reads <meta name="theme-color">,
 * using it for the accent rule down the left edge.
 */
export function DiscordPreview({ card, draft, host }: PreviewProps) {
  const spec = PLATFORMS.discord;

  // Only trust a literal hex; named colours and functional syntax vary too much
  // to guess at, and a bad value would silently paint the rule the wrong colour.
  const rule = HEX.test(draft.themeColor.trim()) ? draft.themeColor.trim() : DEFAULT_RULE;

  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.ideal);
  const description =
    card.description && spec.descriptionLimit
      ? truncateToChars(card.description, spec.descriptionLimit.ideal)
      : null;

  return (
    <div
      className="w-full max-w-[480px] p-3"
      style={{
        backgroundColor: "#313338",
        fontFamily: '"gg sans", "Noto Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        className="flex max-w-[432px] flex-col gap-2 py-2 pl-3 pr-4"
        style={{
          backgroundColor: "#2b2d31",
          borderLeft: `4px solid ${rule}`,
          borderRadius: 4,
        }}
      >
        <div className="flex flex-col gap-1">
          <span className="truncate text-[12px] leading-4" style={{ color: "#dbdee1" }}>
            {card.siteName || host}
          </span>
          <span
            className="line-clamp-2 text-[16px] font-semibold leading-[22px]"
            style={{ color: "#00a8fc" }}
          >
            {title.text}
          </span>
        </div>

        {description ? (
          <span
            className="line-clamp-4 text-[14px] leading-[18px]"
            style={{ color: "#dbdee1" }}
          >
            {description.text}
          </span>
        ) : null}

        {card.image ? (
          <div className="mt-0.5 overflow-hidden" style={{ borderRadius: 4 }}>
            <PreviewImage
              src={card.image}
              alt={card.imageAlt}
              ratio={1.91}
              width={400}
              scheme="dark"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
