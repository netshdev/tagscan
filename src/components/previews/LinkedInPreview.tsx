"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/**
 * LinkedIn feed share. Notably LinkedIn does *not* render og:description in the
 * feed - only the image, title, and domain - so this preview omits it rather
 * than showing text the user will never actually see.
 */
export function LinkedInPreview({ card, host, scheme }: PreviewProps) {
  const dark = scheme === "dark";
  const spec = PLATFORMS.linkedin;

  const colors = dark
    ? { bg: "#1b1f23", border: "#ffffff26", title: "#ffffffe6", muted: "#ffffff99" }
    : { bg: "#ffffff", border: "#00000026", title: "#000000e6", muted: "#00000099" };

  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.ideal);

  return (
    <div
      className="w-full max-w-[480px] overflow-hidden"
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 2,
        fontFamily:
          '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <PreviewImage
        src={card.image}
        alt={card.imageAlt}
        ratio={1.91}
        width={478}
        scheme={scheme}
        emptyLabel="No og:image"
      />

      <div className="flex flex-col gap-1 px-3 py-2.5">
        <span
          className="line-clamp-2 text-[16px] font-semibold leading-[1.35]"
          style={{ color: colors.title }}
        >
          {title.text}
        </span>
        <span className="truncate text-[12px] leading-4" style={{ color: colors.muted }}>
          {host}
        </span>
      </div>
    </div>
  );
}
