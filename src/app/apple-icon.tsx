import { ImageResponse } from "next/og";
import { ACCENT, markDataUri } from "@/lib/brand";

/** iOS renders the home-screen icon at 180×180 and masks the corners itself. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Full-bleed rather than a rounded square on a transparent field: iOS applies its
 * own squircle mask, so pre-rounding the artwork leaves a pale halo of background
 * showing through outside the radius. `radius: 0` for the same reason.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ACCENT,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri({ size: 132, radius: 0, background: ACCENT })} alt="" />
      </div>
    ),
    size,
  );
}
