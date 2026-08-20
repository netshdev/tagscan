import type { MetadataRoute } from "next";
import { ACCENT } from "@/lib/brand";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";
import { THEME_BG } from "@/lib/theme";

/**
 * A minimal manifest, not a PWA claim.
 *
 * It exists so browsers get a real name and icon when the site is installed or
 * pinned, and so the `<link rel="manifest">` a metadata audit looks for is present.
 * `display: "browser"` is honest - nothing here works offline, and there is no
 * service worker, so promising a standalone app window would be a lie the first
 * time someone opened it on a plane.
 *
 * `background_color` tracks the light theme because that is what the OS paints
 * behind the splash before any of our CSS or the theme script has run.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "browser",
    background_color: THEME_BG.light,
    theme_color: ACCENT,
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        // "any" rather than a pixel list: one vector covers every size.
        sizes: "any",
      },
    ],
  };
}
