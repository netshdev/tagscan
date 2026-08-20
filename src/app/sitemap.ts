import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * A single entry, and that's correct rather than lazy.
 *
 * The app is one route. `?url=` variants are the same page with an instruction
 * attached and must stay out: they'd be near-duplicate URLs whose content depends
 * on a third-party site, and listing them would invite a crawler to trigger a scan
 * of someone else's page on every visit.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl().toString(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
