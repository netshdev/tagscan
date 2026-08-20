import { runAudit } from "./meta/audit";
import { extractMeta } from "./meta/extract";
import { probeImages } from "./meta/probe";
import { imageUrls, toDraft } from "./meta/resolve";
import type { Inspection } from "./meta/types";

/** Whole-fetch budget, redirects included. */
const TIMEOUT = 15_000;

/** Redirect hops before giving up, matching what browsers allow. */
const MAX_REDIRECTS = 10;

/**
 * Bytes of HTML retained. The tags this tool reads all live in `<head>`, so a
 * truncated body still yields a complete extraction - the cap exists to keep a
 * pathological page from exhausting memory, not to reject it.
 */
const MAX_BYTES = 5_000_000;

/**
 * Sent instead of a bot UA because a meaningful number of sites serve stripped
 * markup - or a 403 - to anything that looks automated, and the stripped version
 * isn't what the crawlers this tool models would receive.
 */
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 TagScan/1.0";

/**
 * Rejects hostnames that point at infrastructure rather than the public web.
 *
 * Best-effort by design: it matches on the literal hostname and does not resolve
 * DNS, so a public name with a private A record still gets through. Deploying
 * this publicly wants egress restrictions as the real control. Applied to every
 * redirect hop, not just the entered URL, since a redirect is otherwise a trivial
 * way around it.
 */
function assertPublicHost(parsed: URL): void {
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    // IPv6 loopback, link-local (fe80::/10) and unique-local (fc00::/7).
    /^f[cd]/.test(host) ||
    /^fe[89ab]/.test(host)
  ) {
    throw new Error("Private and local addresses can't be inspected.");
  }
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Please enter a URL.");

  /**
   * Rejected before the `https://` default is applied, because prepending a
   * scheme to something that already has one turns `file:///etc/passwd` into a
   * request for a host named "file" - which then fails as a DNS error and tells
   * the user nothing about what was actually wrong.
   *
   * The lookahead is load-bearing: it requires an authority (`//`) so that a bare
   * `example.com:8080` isn't read as a scheme named "example.com". Schemes that
   * legitimately have no authority are listed separately.
   */
  const scheme = /^([a-z][a-z0-9+.-]*):(?=\/\/)/i.exec(trimmed)?.[1]?.toLowerCase();
  if (
    (scheme && scheme !== "http" && scheme !== "https") ||
    /^(file|data|javascript|vbscript|blob|about|view-source|chrome|resource):/i.test(trimmed)
  ) {
    throw new Error("Only http and https URLs are supported.");
  }

  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProto);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }
  assertPublicHost(parsed);
  return parsed.toString();
}

/** Turns Node's opaque `fetch failed` into something a user can act on. */
function friendlyFetchError(err: unknown): string {
  const cause = (err as { cause?: { code?: string } })?.cause;
  const code = cause?.code ?? "";
  const message = err instanceof Error ? err.message : String(err);

  if (err instanceof Error && err.name === "AbortError")
    return "The page never responded. It's likely down, very slow, or blocking automated visits.";
  if (/ENOTFOUND|EAI_AGAIN/.test(code)) return "That domain doesn't resolve - check the URL.";
  if (/ECONNREFUSED|ECONNRESET|EPIPE/.test(code)) return "The site refused the connection.";
  if (/CERT|SSL|DEPTH_ZERO/.test(code)) return "The site has an SSL or certificate problem.";
  if (/UND_ERR_CONNECT_TIMEOUT|ETIMEDOUT/.test(code))
    return "The page never responded. It's likely down, very slow, or blocking automated visits.";
  if (/timed out|timeout/i.test(message)) return "The request timed out.";
  return "Couldn't load that page - it may be down or blocking automated visits.";
}

/**
 * Picks the character encoding, in the order a browser would: the transport says
 * so, else the document says so, else UTF-8.
 *
 * Worth the effort because getting this wrong mangles exactly the text this tool
 * exists to show - a title or description on any non-UTF-8 page.
 */
function decodeHtml(bytes: Uint8Array, contentType: string): string {
  const fromHeader = /charset=["']?([^"';,\s]+)/i.exec(contentType)?.[1];

  // Sniff the head as ASCII to find a declared charset. Every encoding this
  // matters for is ASCII-compatible for markup, so this is safe to do first.
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 4096));
  const fromMeta =
    /<meta[^>]+charset=["']?([^"'>\s;]+)/i.exec(head)?.[1] ??
    /<meta[^>]+content=["'][^"']*charset=([^"';\s]+)/i.exec(head)?.[1];

  for (const label of [fromHeader, fromMeta, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label.trim().toLowerCase(), { fatal: false }).decode(bytes);
    } catch {
      continue; // unknown label - fall through to the next candidate
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** Reads the body up to `MAX_BYTES`, then stops pulling from the stream. */
async function readCapped(response: Response): Promise<Uint8Array> {
  const body = response.body;
  if (!body) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = body.getReader();
  try {
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  const out = new Uint8Array(Math.min(size, MAX_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= out.length) break;
    const slice = chunk.subarray(0, out.length - offset);
    out.set(slice, offset);
    offset += slice.byteLength;
  }
  return out;
}

interface Fetched {
  finalUrl: string;
  html: string;
}

/**
 * Follows redirects by hand rather than letting fetch do it, so every hop's
 * hostname passes `assertPublicHost` and the final URL is known for certain -
 * relative-URL resolution downstream depends on it.
 */
async function fetchHtml(url: string, signal: AbortSignal): Promise<Fetched> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
      });
    } catch (err) {
      throw new Error(friendlyFetchError(err));
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => {});
      if (!location) throw new Error(`The site returned HTTP ${response.status}.`);

      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new Error("The site redirected to an address that isn't valid.");
      }
      if (!/^https?:$/.test(next.protocol)) {
        throw new Error("The site redirected to a protocol that isn't supported.");
      }
      assertPublicHost(next);
      current = next.toString();
      continue;
    }

    if (response.status >= 400) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`The site returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/html|xml|^text\//i.test(contentType)) {
      await response.body?.cancel().catch(() => {});
      const kind = contentType.split(";")[0].trim();
      throw new Error(`That URL serves ${kind}, not an HTML page.`);
    }

    const bytes = await readCapped(response);
    return {
      // `response.url` is empty on a manual-redirect response in some runtimes,
      // so the hop we actually requested is the reliable source.
      finalUrl: response.url || current,
      html: decodeHtml(bytes, contentType),
    };
  }

  throw new Error("That URL redirects too many times.");
}

/**
 * Fetches a page, reads its tags, and audits them. Keeps nothing.
 *
 * No browser is involved: everything this returns comes from the HTML as served,
 * which is the same input the search and social crawlers being modelled work
 * from. See `extractMeta` for what that costs on client-rendered pages.
 */
export async function inspect(rawUrl: string): Promise<Inspection> {
  const requestedUrl = normalizeUrl(rawUrl);
  const startedAt = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  let fetched: Fetched;
  try {
    fetched = await fetchHtml(requestedUrl, controller.signal);
  } finally {
    clearTimeout(timer);
  }

  const { finalUrl, html } = fetched;
  const rawExtract = extractMeta(html, finalUrl);
  const draft = toDraft(rawExtract);
  const probes = await probeImages(imageUrls(draft));
  const { checks, summary } = runAudit(draft, rawExtract, probes);

  return {
    requestedUrl,
    finalUrl,
    title: rawExtract.title ?? finalUrl,
    fetchedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    raw: rawExtract,
    draft,
    probes,
    checks,
    summary,
  };
}
