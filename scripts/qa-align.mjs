/**
 * The case reversing CAN fix: land in Porto, fly home from Lisbon, on a
 * plan currently written Lisbon → Porto.
 */
import { chromium } from "playwright-core";

const TRIP = process.argv[2];
const LOCALE = process.argv[3] || "en";
const BASE = "http://localhost:3001";

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await ctx.addCookies([{ name: "paxawa_locale", value: LOCALE, domain: "localhost", path: "/" }]);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const NOISE = ["Plan", "Now", "Discover", "Money", "Add", "Back", "?", "Allow", "Decline"];
async function show(label) {
  const txt = await page.locator("body").innerText();
  const keep = txt.split("\n").map((l) => l.trim()).filter(Boolean)
    .filter((l) => !NOISE.includes(l) && !l.startsWith("We'd like to track") && !l.startsWith("Help us build"));
  console.log(`\n── ${label} ──\n` + keep.map((l) => "  " + l).join("\n"));
}
async function go() {
  await page.goto(`${BASE}/trips/${TRIP}/shape`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3200);
}

await go();

// depart = Lisbon (the FIRST city) — now both ends are wrong way round
await page.getByText(/You fly home from|ترجعون من/).first().click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: /^(Lisbon|لشبونة)$/ }).last().click();
await page.waitForTimeout(3000);
await show("both ends reversed — expect two mismatches and a repair");
await page.screenshot({ path: `/tmp/qa-align-before-${LOCALE}.png` });

const align = page.getByRole("button", { name: /Turn the trip around|اقلبوا ترتيب الرحلة/ }).first();
if (await align.count()) {
  await align.click();
  await page.waitForTimeout(3500);
  await show("after turning the trip around");
  await page.screenshot({ path: `/tmp/qa-align-after-${LOCALE}.png` });
} else {
  console.log("\n  !! no repair offered");
}

console.log("\n── page errors ──\n  " + (errors.length ? errors.slice(0, 5).join("\n  ") : "none"));
await browser.close();
