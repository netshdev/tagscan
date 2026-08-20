/**
 * Screenshots the app for visual review.
 *
 * Usage: node scripts/shot.mjs [port] [url-to-scan]
 *
 * Results aren't persisted, so there is no id to deep-link to - every shot of a
 * result comes from one real scan driven through `?url=`, then switching tabs in
 * the same page. That keeps it to a single crawl of the target site.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const port = process.argv[2] ?? "3000";
const target = process.argv[3] ?? "news.ycombinator.com";
const base = `http://localhost:${port}`;
const OUT = "shots";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function shotPage(name, path, { theme = "light", width = 1440, height = 1000 } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: theme });
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.close();
  console.log(`${OUT}/${name}.png`);
}

await shotPage("01-home-light", "/");
await shotPage("02-home-dark", "/", { theme: "dark" });
await shotPage("03-not-found", "/this-page-does-not-exist");

/* One scan, then every view and both themes off the same result. */
for (const theme of ["light", "dark"]) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: theme,
  });
  await page.goto(`${base}/?url=${encodeURIComponent(target)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tablist", { name: "Result view" }).waitFor({ timeout: 150_000 });
  await page.waitForTimeout(1200);

  const platforms = theme === "light" ? ["google", "x", "discord", "mastodon", "bluesky"] : ["facebook"];
  for (const platform of platforms) {
    await page.getByRole("tab", { name: new RegExp(`^${platform}$`, "i") }).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/10-preview-${platform}-${theme}.png`, fullPage: true });
    console.log(`${OUT}/10-preview-${platform}-${theme}.png`);
  }

  for (const view of ["Audit", "Design", "Code", "Report"]) {
    await page.getByRole("tab", { name: view }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/20-${view.toLowerCase()}-${theme}.png`, fullPage: true });
    console.log(`${OUT}/20-${view.toLowerCase()}-${theme}.png`);
  }

  // What the printed report actually looks like.
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/30-report-print-${theme}.png`, fullPage: true });
  console.log(`${OUT}/30-report-print-${theme}.png`);

  await page.close();
}

await browser.close();
