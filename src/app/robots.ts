import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * `/api/` is disallowed because it holds one POST-only inspection endpoint: there
 * is nothing there for a crawler to index, and a bot retrying it would fetch a
 * third-party site on our behalf for no reason.
 *
 * Everything else is open. There are no per-user or stored pages to protect -
 * results are never persisted - so the only surface is the homepage itself.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base.host,
  };
}
