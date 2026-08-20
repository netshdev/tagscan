"use client";

import { truncateToChars } from "@/lib/meta/measure";
import { PLATFORMS } from "@/lib/meta/platforms";
import { PreviewImage } from "./PreviewImage";
import { NO_TITLE, type PreviewProps } from "./types";

/**
 * WhatsApp renders the preview inside the outgoing chat bubble, which is why the
 * card sits on a green ground here. It also switches between a banner and a small
 * square thumbnail depending on image size - modelled below.
 */
export function WhatsAppPreview({ card, host, scheme }: PreviewProps) {
  const dark = scheme === "dark";
  const spec = PLATFORMS.whatsapp;

  const colors = dark
    ? { bubble: "#005c4b", inner: "#025144", title: "#e9edef", muted: "#8696a0", link: "#53bdeb" }
    : { bubble: "#d9fdd3", inner: "#d1f4cc", title: "#111b21", muted: "#667781", link: "#027eb5" };

  const title = truncateToChars(card.title || NO_TITLE, spec.titleLimit.max);
  const description =
    card.description && spec.descriptionLimit
      ? truncateToChars(card.description, spec.descriptionLimit.max)
      : null;

  return (
    <div
      className="w-full max-w-[420px] p-3"
      style={{
        backgroundColor: dark ? "#0b141a" : "#efeae2",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      <div
        className="ml-auto max-w-[340px] overflow-hidden p-1"
        style={{ backgroundColor: colors.bubble, borderRadius: 8 }}
      >
        <div className="overflow-hidden" style={{ backgroundColor: colors.inner, borderRadius: 6 }}>
          <PreviewImage
            src={card.image}
            alt={card.imageAlt}
            ratio={1.91}
            width={332}
            scheme={scheme}
            emptyLabel="No og:image"
          />
          <div className="flex flex-col gap-0.5 px-2.5 py-2">
            <span
              className="line-clamp-2 text-[13px] font-medium leading-[18px]"
              style={{ color: colors.title }}
            >
              {title.text}
            </span>
            {description ? (
              <span
                className="line-clamp-2 text-[12px] leading-[17px]"
                style={{ color: colors.muted }}
              >
                {description.text}
              </span>
            ) : null}
            <span className="truncate text-[12px] leading-[17px]" style={{ color: colors.muted }}>
              {host}
            </span>
          </div>
        </div>

        <p className="px-1.5 pb-0.5 pt-1 text-[13px]" style={{ color: colors.link }}>
          {card.url || `https://${host}`}
        </p>
      </div>
    </div>
  );
}
