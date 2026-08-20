/**
 * Same card as Open Graph.
 *
 * X falls back to `og:image` when `twitter:image` is absent, so this is belt and
 * braces - but it costs one re-export, and being explicit means the X crawler
 * never has to guess. Re-exported rather than duplicated so the artwork can only
 * ever be edited in one place.
 */
export { default, size, contentType, alt } from "./opengraph-image";
