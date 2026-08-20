import { chromium, type Browser, type Page, type Response } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { runAudit } from "./meta/audit";
import { extractMeta } from "./meta/extract";
import { probeImages } from "./meta/probe";
import { imageUrls, toDraft } from "./meta/resolve";
import type { Inspection } from "./meta/types";
import { buildReport } from "./scoring";
import { collectMetrics } from "./metrics";
import type { AxeViolation, Report } from "./types";

const NAV_TIMEOUT = 35_000;

/** Failing elements retained per axe rule, for the report's detail sections. */
const MAX_NODES_PER_RULE = 12;

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Please enter a URL.");
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

  // Block the obvious SSRF targets. This is a best-effort filter on the hostname
  // only - it does not resolve DNS, so it won't stop a domain that points at a
  // private address. Deploying this publicly needs egress restrictions too.
  const host = parsed.hostname;
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
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw new Error("Private and local addresses can't be inspected.");
  }
  return parsed.toString();
}

/** Translates raw Chromium/Playwright navigation errors into human messages. */
function friendlyNavError(raw: string): string {
  if (/ERR_NAME_NOT_RESOLVED|ERR_ADDRESS_UNREACHABLE/.test(raw))
    return "That domain doesn't resolve - check the URL.";
  if (/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED/.test(raw))
    return "The site refused the connection.";
  if (/ERR_CERT|ERR_SSL/.test(raw)) return "The site has an SSL or certificate problem.";
  if (/ERR_HTTP2_PROTOCOL_ERROR|ERR_QUIC_PROTOCOL_ERROR/.test(raw))
    return "The site blocked the connection at the protocol level, which usually means bot protection.";
  if (/ERR_ABORTED|ERR_BLOCKED_BY|403|ERR_ACCESS_DENIED/.test(raw))
    return "The site blocked automated access, so it can't be inspected.";
  if (/Timeout|timeout|exceeded/.test(raw))
    return "The page never responded. It's likely down, very slow, or blocking automated visits.";
  return "Couldn't load that page - it may be down or blocking automated visits.";
}

async function navigate(page: Page, url: string): Promise<Response | null> {
  // "commit" resolves as soon as the main-document response arrives. Heavy or
  // bot-protected sites often never reach "domcontentloaded" promptly, so this
  // is the resilient primary strategy.
  let response: Response | null;
  try {
    response = await page.goto(url, { waitUntil: "commit", timeout: NAV_TIMEOUT });
  } catch (err) {
    throw new Error(friendlyNavError(err instanceof Error ? err.message : String(err)));
  }
  // Best effort: let the DOM parse, but don't fail the inspection if the page
  // keeps streaming - whatever has rendered is still worth analyzing.
  await page.waitForLoadState("domcontentloaded", { timeout: 12_000 }).catch(() => {});
  return response;
}

export async function inspect(rawUrl: string): Promise<Inspection> {
  const requestedUrl = normalizeUrl(rawUrl);
  const startedAt = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      // Some sites fail Chromium's HTTP/2 negotiation with
      // ERR_HTTP2_PROTOCOL_ERROR; forcing HTTP/1.1 makes navigation reliable.
      args: ["--disable-http2"],
    });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      ignoreHTTPSErrors: true,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 TagScan/1.0",
    });
    const page = await context.newPage();

    const response = await navigate(page, requestedUrl);
    if (response && response.status() >= 400) {
      throw new Error(`The site returned HTTP ${response.status()}.`);
    }
    // Give client-rendered apps a moment to paint before measuring styles.
    await page.waitForTimeout(1500);

    // Both page passes are independent of each other.
    const [rawExtract, metrics] = await Promise.all([
      page.evaluate(extractMeta),
      page.evaluate(collectMetrics),
    ]);

    const draft = toDraft(rawExtract);

    // The axe pass and the image probes are independent too, and axe is the slow
    // one - running them together keeps it off the critical path. A failing axe
    // run must not sink the whole inspection, so it degrades to null.
    const [violations, probes] = await Promise.all([
      new AxeBuilder({ page })
        .analyze()
        .then((results): AxeViolation[] =>
          results.violations.map((v) => ({
            id: v.id,
            impact: (v.impact as AxeViolation["impact"]) ?? "minor",
            help: v.help,
            description: v.description,
            helpUrl: v.helpUrl,
            tags: v.tags,
            nodeCount: v.nodes.length,
            // Cap the sample: a single rule can fail on hundreds of elements,
            // and the stored payload would balloon for no added insight.
            nodes: v.nodes.slice(0, MAX_NODES_PER_RULE).map((node) => ({
              target: node.target.flat().join(" "),
              html: node.html.slice(0, 400),
              failureSummary: node.failureSummary ?? null,
            })),
          })),
        )
        .catch(() => null),
      probeImages(imageUrls(draft)),
    ]);

    const finalUrl = page.url();
    const title = rawExtract.title ?? finalUrl;
    const { checks, summary } = runAudit(draft, rawExtract, probes);

    let design: Report | null = null;
    if (violations) {
      design = buildReport({
        url: requestedUrl,
        finalUrl,
        title,
        metrics,
        violations,
        durationMs: Date.now() - startedAt,
        fetchedAt: new Date(startedAt).toISOString(),
      });
    }

    return {
      requestedUrl,
      finalUrl,
      title,
      fetchedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      raw: rawExtract,
      draft,
      probes,
      checks,
      summary,
      design,
    };
  } finally {
    await browser?.close().catch(() => {});
  }
}
