"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/**
 * Facebook feed link attachment: banner image above a grey metadata strip with
 * the domain in small caps. Facebook reads og:* only, so a page that sets just
 * twitter:* tags previews here as empty - which is the point of showing it.
 */
export function FacebookPreview({ card, host, scheme }: PreviewProps) {
  const dark = scheme === "dark";
  const spec = PLATFORMS.facebook;

  const colors = dark
    ? {
        strip: "#3a3b3c",
        border: "#3e4042",
        title: "#e4e6eb",
        muted: "#b0b3b8",
      }
    : {
        strip: "#f2f3f5",
        border: "#dadde1",
        title: "#050505",
        muted: "#65676b",
      };

  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.max);
  const description =
    card.description && spec.descriptionLimit
      ? truncateToChars(card.description, spec.descriptionLimit.ideal)
      : null;

  return (
    <div
      className="w-full max-w-[500px] overflow-hidden"
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <PreviewImage
        src={card.image}
        alt={card.imageAlt}
        ratio={1.91}
        width={498}
        scheme={scheme}
        emptyLabel="No og:image"
      />

      <div
        className="flex flex-col gap-0.5 px-3 py-2.5"
        style={{ backgroundColor: colors.strip, borderTop: `1px solid ${colors.border}` }}
      >
        <span
          className="truncate text-[12px] uppercase leading-4"
          style={{ color: colors.muted, letterSpacing: "0.02em" }}
        >
          {host}
        </span>
        <span
          className="line-clamp-2 text-[16px] font-semibold leading-5"
          style={{ color: colors.title }}
        >
          {title.text}
        </span>
        {description ? (
          <span
            className="line-clamp-1 text-[14px] leading-5"
            style={{ color: colors.muted }}
          >
            {description.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
