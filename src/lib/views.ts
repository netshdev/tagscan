import { PLATFORM_ORDER, type PlatformId } from "./meta/platforms";

export type View = "previews" | "audit" | "design" | "code" | "report";

const VIEWS: readonly View[] = ["previews", "audit", "design", "code", "report"];

/**
 * Query-param parsers. Deliberately in a server-safe module: the page reads
 * `searchParams` on the server, and exports of a `"use client"` module become
 * client references that can't be invoked there.
 */
export function parseView(value: string | string[] | undefined): View | undefined {
  return typeof value === "string" && VIEWS.includes(value as View)
    ? (value as View)
    : undefined;
}

export function parsePlatform(
  value: string | string[] | undefined,
): PlatformId | undefined {
  return typeof value === "string" && PLATFORM_ORDER.includes(value as PlatformId)
    ? (value as PlatformId)
    : undefined;
}
