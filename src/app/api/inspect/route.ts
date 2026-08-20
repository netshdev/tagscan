import { inspect } from "@/lib/inspect";

// Route handlers are uncached by default in Next 16, and non-GET methods are
// never cached, so no `dynamic` export is needed here. `runtime` stays "nodejs"
// for the manual redirect handling and `TextDecoder`'s full encoding set.
export const maxDuration = 30;

/** Errors caused by the *target* site are the caller's problem, not a 5xx here. */
const TARGET_ISSUE =
  /valid|supported|private|local|enter a url|HTTP \d|resolve|refused|blocked|SSL|certificate|protocol|timed out|too long|too large|too many|redirects|not an HTML page|never responded|Couldn't load/i;

/**
 * Returns the inspection and keeps nothing.
 *
 * Results live only in the browser tab that requested them: there is no store, so
 * nothing to leak, expire, or migrate - and no server state to break when this is
 * deployed somewhere with an ephemeral filesystem.
 */
export async function POST(request: Request) {
  let url: string;
  try {
    const body = await request.json();
    url = typeof body?.url === "string" ? body.url : "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const inspection = await inspect(url);
    return Response.json(inspection);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong inspecting that page.";
    return Response.json({ error: message }, {
      status: TARGET_ISSUE.test(message) ? 400 : 502,
    });
  }
}
