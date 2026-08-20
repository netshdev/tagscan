import { ImageResponse } from "next/og";
import { ACCENT, CARD_BG, markDataUri } from "@/lib/brand";
import { OG_IMAGE_ALT, SITE_NAME } from "@/lib/site";

/**
 * 1200×630 is the ratio every platform here crops toward (1.91:1), and it's what
 * Next emits as `og:image:width`/`height` from this export - so the declared
 * dimensions match the real pixels without being written down twice.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = OG_IMAGE_ALT;

/**
 * Deliberately flat colour: no gradients, photos, or blur.
 *
 * Slack drops the thumbnail on anything over 500 KB, and a PNG of solid fills
 * compresses to a few tens of KB, whereas a gradient of this size can blow past
 * that on its own. It also reads at the 240px-wide crop a timeline actually shows.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CARD_BG,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markDataUri({ size: 104 })} alt="" width={104} height={104} />
          <span style={{ fontSize: 60, fontWeight: 700, color: "#fdfdfe", letterSpacing: -1 }}>
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#fdfdfe",
              lineHeight: 1.15,
              letterSpacing: -1.5,
            }}
          >
            See your link before you post it
          </span>
          <span style={{ fontSize: 32, color: "#a1a3ad", marginTop: 20, lineHeight: 1.4 }}>
            Preview, edit and audit the meta tags behind every share.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", width: 64, height: 8, background: ACCENT, borderRadius: 4 }} />
          <span style={{ fontSize: 26, color: "#8a8c96" }}>
            Google · X · Facebook · LinkedIn · Slack · Discord · WhatsApp
          </span>
        </div>
      </div>
    ),
    size,
  );
}
