"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/**
 * Pinterest pin. The only platform that wants portrait 2:3 rather than a 1.91:1
 * banner, so a standard og:image gets cropped hard here - rendering it at 2:3
 * makes that immediately visible instead of theoretical.
 */
export function PinterestPreview({ card, host }: PreviewProps) {
  const spec = PLATFORMS.pinterest;
  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.ideal);

  return (
    <div
      className="w-full max-w-[320px] p-3"
      style={{
        backgroundColor: "#ffffff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="w-[236px] overflow-hidden" style={{ borderRadius: 16 }}>
        <PreviewImage
          src={card.image}
          alt={card.imageAlt}
          ratio={2 / 3}
          width={236}
          emptyLabel="No og:image"
        />
      </div>

      <div className="mt-2 flex w-[236px] flex-col gap-1">
        <span
          className="line-clamp-2 text-[14px] font-semibold leading-[18px]"
          style={{ color: "#111111" }}
        >
          {title.text}
        </span>
        <span className="truncate text-[12px] leading-4" style={{ color: "#767676" }}>
          {host}
        </span>
      </div>

      <p className="mt-2 w-[236px] text-[11px] leading-4" style={{ color: "#767676" }}>
        Pinterest crops toward 2:3. A 1200×630 banner loses most of its width here.
      </p>
    </div>
  );
}
