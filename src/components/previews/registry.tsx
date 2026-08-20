import type { ComponentType } from "react";
import type { PlatformId } from "@/lib/meta/platforms";
import { BlueskyPreview } from "./BlueskyPreview";
import { DiscordPreview } from "./DiscordPreview";
import { FacebookPreview } from "./FacebookPreview";
import { GooglePreview } from "./GooglePreview";
import { LinkedInPreview } from "./LinkedInPreview";
import { MastodonPreview } from "./MastodonPreview";
import { PinterestPreview } from "./PinterestPreview";
import { SlackPreview } from "./SlackPreview";
import { TelegramPreview } from "./TelegramPreview";
import { WhatsAppPreview } from "./WhatsAppPreview";
import { XPreview } from "./XPreview";
import type { PreviewProps } from "./types";

export const PREVIEWS: Record<PlatformId, ComponentType<PreviewProps>> = {
  google: GooglePreview,
  x: XPreview,
  facebook: FacebookPreview,
  linkedin: LinkedInPreview,
  slack: SlackPreview,
  discord: DiscordPreview,
  whatsapp: WhatsAppPreview,
  telegram: TelegramPreview,
  mastodon: MastodonPreview,
  bluesky: BlueskyPreview,
  pinterest: PinterestPreview,
};

/**
 * Brand colour plus a short monogram, rather than reproduced logos. A wrong or
 * distorted logo looks worse than a clean mark, and this keeps every tab the
 * same size and legible at 14px in both themes.
 *
 * `darkBg`/`darkFg` override the brand colour where it would disappear against
 * dark chrome. Only X needs it - its near-black brand is invisible on a dark
 * strip, which is why X itself inverts its own logo in dark mode.
 */
interface Mark {
  bg: string;
  fg: string;
  glyph: string;
  darkBg?: string;
  darkFg?: string;
}

const MARKS: Record<PlatformId, Mark> = {
  google: { bg: "#4285f4", fg: "#ffffff", glyph: "G" },
  x: { bg: "#0f1419", fg: "#ffffff", glyph: "X", darkBg: "#ffffff", darkFg: "#0f1419" },
  facebook: { bg: "#1877f2", fg: "#ffffff", glyph: "f" },
  linkedin: { bg: "#0a66c2", fg: "#ffffff", glyph: "in" },
  slack: { bg: "#611f69", fg: "#ffffff", glyph: "S" },
  discord: { bg: "#5865f2", fg: "#ffffff", glyph: "D" },
  whatsapp: { bg: "#25d366", fg: "#ffffff", glyph: "W" },
  telegram: { bg: "#229ed9", fg: "#ffffff", glyph: "T" },
  mastodon: { bg: "#6364ff", fg: "#ffffff", glyph: "m" },
  bluesky: { bg: "#0085ff", fg: "#ffffff", glyph: "b" },
  pinterest: { bg: "#e60023", fg: "#ffffff", glyph: "P" },
};

export function PlatformMark({ id, size = 16 }: { id: PlatformId; size?: number }) {
  const mark = MARKS[id];

  // Both palettes ride along as custom properties and a `dark:` variant picks
  // the pair, so this stays a server component with no theme state to hydrate.
  return (
    <span
      aria-hidden="true"
      className={
        "inline-grid shrink-0 place-items-center rounded-[4px] font-bold leading-none " +
        "bg-(--mark-bg) text-(--mark-fg) dark:bg-(--mark-bg-dark) dark:text-(--mark-fg-dark)"
      }
      style={
        {
          width: size,
          height: size,
          // Monograms need to shrink faster than the box to stay inside it.
          fontSize: mark.glyph.length > 1 ? size * 0.44 : size * 0.62,
          "--mark-bg": mark.bg,
          "--mark-fg": mark.fg,
          "--mark-bg-dark": mark.darkBg ?? mark.bg,
          "--mark-fg-dark": mark.darkFg ?? mark.fg,
        } as React.CSSProperties
      }
    >
      {mark.glyph}
    </span>
  );
}
