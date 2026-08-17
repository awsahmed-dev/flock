/**
 * Renders the same instant to two travellers in different zones, so the phase
 * fix can be seen rather than asserted.
 *
 *   node scripts/tz-capture.mjs <label>
 *
 * Writes /tmp/shots/<label>-<page>-<zone>.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const label = process.argv[2] ?? "run";
const BASE = "http://localhost:3100";
const TRIP = "33333333-3333-3333-3333-333333333333"; // "Seoul Now", ends today (UTC)

const ZONES = [
  ["UTC", "utc"],
  ["Pacific/Kiritimati", "kiritimati"], // UTC+14 — already tomorrow
];
const PAGES = [
  ["dashboard", "/dashboard"],
  ["trip", `/trips/${TRIP}`],
];

mkdirSync("/tmp/shots", { recursive: true });
// The sandbox ships Chromium at a fixed path; the project's pinned
// @playwright/test version may not match the downloaded revision.
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});

for (const [zone, slug] of ZONES) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    // Make the BROWSER's zone match the cookie, so the client half of any
    // remaining disagreement would show up rather than being masked.
    timezoneId: zone,
  });
  await ctx.addCookies([
    { name: "paxawa_tz", value: zone, domain: "localhost", path: "/" },
    { name: "paxawa_locale", value: "en", domain: "localhost", path: "/" },
  ]);
  const page = await ctx.newPage();

  for (const [name, path] of PAGES) {
    // networkidle never settles here — the map tiles and the notification
    // poll keep a connection open. domcontentloaded + a settle wait is enough
    // for a server-rendered phase screen.
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(6000);
    const file = `/tmp/shots/${label}-${name}-${slug}.png`;
    await page.screenshot({ path: file });

    // Pull the text that actually proves the point, so the check does not
    // depend on me reading a screenshot correctly.
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const marks = {
      zone,
      page: name,
      // dashboard section labels
      sawMemories: /MEMORIES|Memories/.test(body),
      sawComingUp: /COMING UP|Coming Up/.test(body),
      // trip-screen phase tells
      sawWrap: /The Wrap|Wrapped|Trip complete|Relive/i.test(body),
      sawUpNext: /UP NEXT|Up next/i.test(body),
      seoulPresent: /Seoul/.test(body),
    };
    console.log(JSON.stringify(marks));
  }
  await ctx.close();
}
await browser.close();
console.log(`\nwrote /tmp/shots/${label}-*.png`);
