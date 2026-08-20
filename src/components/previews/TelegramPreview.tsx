"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/**
 * Telegram message preview: a thin blue rule, the site name, title, description,
 * then the image - all inside the message bubble.
 */
export function TelegramPreview({ card, host, scheme }: PreviewProps) {
  const dark = scheme === "dark";
  const spec = PLATFORMS.telegram;

  const colors = dark
    ? { page: "#0e1621", bubble: "#182533", text: "#ffffff", muted: "#8b9398", accent: "#6ab3f3" }
    : { page: "#e6ebee", bubble: "#ffffff", text: "#000000", muted: "#7a8894", accent: "#3390ec" };

  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.ideal);
  const description =
    card.description && spec.descriptionLimit
      ? truncateToChars(card.description, spec.descriptionLimit.ideal)
      : null;

  return (
    <div
      className="w-full max-w-[440px] p-3"
      style={{
        backgroundColor: colors.page,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        className="max-w-[380px] p-2"
        style={{ backgroundColor: colors.bubble, borderRadius: 12 }}
      >
        <div
          className="flex flex-col gap-0.5 pl-2"
          style={{ borderLeft: `2px solid ${colors.accent}` }}
        >
          <span
            className="truncate text-[14px] font-medium leading-[19px]"
            style={{ color: colors.accent }}
          >
            {card.siteName || host}
          </span>
          <span
            className="line-clamp-2 text-[14px] font-medium leading-[19px]"
            style={{ color: colors.text }}
          >
            {title.text}
          </span>
          {description ? (
            <span
              className="line-clamp-3 text-[14px] leading-[19px]"
              style={{ color: colors.text }}
            >
              {description.text}
            </span>
          ) : null}

          {card.image ? (
            <div className="mt-1.5 overflow-hidden" style={{ borderRadius: 4 }}>
              <PreviewImage
                src={card.image}
                alt={card.imageAlt}
                ratio={1.91}
                width={356}
                scheme={scheme}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
