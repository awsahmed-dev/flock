/**
 * Self-test: the plain description lines, and open-jaw arrival/departure.
 *
 * Run from flock/ with the dev server on :3001.
 */
import { chromium } from "playwright-core";

const TRIP = process.argv[2];
const LOCALE = process.argv[3] || "en";
if (!TRIP) {
  console.error("usage: node scripts/qa-gateways.mjs <tripId> [en|ar]");
  process.exit(1);
}
const BASE = "http://localhost:3001";

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addCookies([
  { name: "paxawa_locale", value: LOCALE, domain: "localhost", path: "/" },
]);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

async function go(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3200);
  await page.locator("[data-cookie-banner] button").first().click().catch(() => {});
}

async function shot(name) {
  await page.screenshot({ path: `/tmp/qa-${name}.png`, fullPage: false });
}

console.log(`\n═══ ${LOCALE.toUpperCase()} · trip ${TRIP.slice(0, 8)} ═══\n`);

await go(`/trips/${TRIP}/shape`);
const shapeText = await page.locator("body").innerText();
console.log("── shape screen ──");
for (const line of shapeText.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 40)) {
  console.log("  " + line);
}
await shot(`shape-${LOCALE}`);

await go(`/trips/${TRIP}/itinerary`);
await page.waitForTimeout(1500);
const itinText = await page.locator("body").innerText();
console.log("\n── itinerary (first 30 lines) ──");
for (const line of itinText.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30)) {
  console.log("  " + line);
}
await shot(`itinerary-${LOCALE}`);

console.log("\n── errors ──");
console.log(errors.length ? errors.slice(0, 6).join("\n") : "  none");

await browser.close();
