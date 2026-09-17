/**
 * Drive the open-jaw flow the way a person would:
 *   add a second city → say you fly home from it → check the checklist
 *   → then create a mismatch and take the offered repair.
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

async function go() {
  await page.goto(`${BASE}/trips/${TRIP}/shape`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3200);
}
const body = () => page.locator("body").innerText();
async function show(label) {
  const txt = await body();
  const keep = txt
    .split("\n").map((l) => l.trim()).filter(Boolean)
    .filter((l) => !["Plan", "Now", "Discover", "Money", "Add", "Back", "?"].includes(l));
  console.log(`\n── ${label} ──`);
  console.log(keep.map((l) => "  " + l).join("\n"));
}

await go();
await show("1. start");

// ── add Porto ────────────────────────────────────────────────────────────
const porto = page.getByRole("button", { name: /^Porto$/ }).first();
if (await porto.count()) {
  await porto.click();
  await page.waitForTimeout(3000);
  console.log("\n  [clicked: add Porto]");
} else {
  console.log("\n  [Porto chip not found — already added?]");
}
await show("2. two cities");

// ── say we fly home from Porto ───────────────────────────────────────────
await page.getByText("You fly home from").first().click();
await page.waitForTimeout(700);
const pick = page.getByRole("button", { name: /^Porto$/ }).last();
await pick.click();
await page.waitForTimeout(3000);
await show("3. departing from Porto");
await page.screenshot({ path: `/tmp/qa-openjaw-${LOCALE}.png` });

// ── now create a mismatch: land in Porto too ─────────────────────────────
await page.getByText("You land in").first().click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: /^Porto$/ }).last().click();
await page.waitForTimeout(3000);
await show("4. landing in Porto — expect a mismatch + repair");
await page.screenshot({ path: `/tmp/qa-mismatch-${LOCALE}.png` });

// ── take the offered repair ──────────────────────────────────────────────
const align = page.getByRole("button", { name: /Turn the trip around|اقلبوا/ }).first();
if (await align.count()) {
  await align.click();
  await page.waitForTimeout(3000);
  await show("5. after turning the trip around");
  await page.screenshot({ path: `/tmp/qa-aligned-${LOCALE}.png` });
} else {
  console.log("\n  !! no 'Turn the trip around' button offered");
}

console.log("\n── page errors ──");
console.log(errors.length ? errors.slice(0, 5).join("\n") : "  none");
await browser.close();
