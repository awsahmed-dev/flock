import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const BASE = "http://localhost:3010";
const DB = "postgresql://postgres@127.0.0.1:5433/paxawa";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/tmp/paxawa-drag"; mkdirSync(OUT, { recursive: true });
const ME = "00000000-0000-0000-0000-000000000001";
const TRIP = "00000000-0000-0000-0000-00000000f0bb";
const sql = (q) => execFileSync("psql", ["-q", "-v", "ON_ERROR_STOP=1", DB, "-c", q], { stdio: ["ignore", "pipe", "pipe"] });
const iso = (d) => d.toISOString().slice(0, 10);
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const mode = process.argv[2] ?? "itin"; // itin | now
sql(`delete from trips where id='${TRIP}';`);
sql(`insert into profiles (id, display_name, email) values ('${ME}','Marco','dev@flock.local') on conflict do nothing;`);
if (mode === "itin") {
  sql(`insert into trips (id,name,destination,start_date,end_date,created_by,currency) values ('${TRIP}','Saudi','Saudi Arabia','${day(20)}','${day(24)}','${ME}','USD');`);
} else {
  sql(`insert into trips (id,name,destination,start_date,end_date,created_by,currency) values ('${TRIP}','Tokyo','Tokyo, Japan','${day(-1)}','${day(3)}','${ME}','USD');`);
  sql(`insert into itinerary_items (trip_id,day_date,title,created_by,start_time,type,location_name,location_lat,location_lng) values ('${TRIP}','${day(0)}','Palace','${ME}','23:30','activity','Tokyo',35.68,139.76);`);
}
sql(`insert into trip_members (trip_id,user_id,display_name,role) values ('${TRIP}','${ME}','Marco','owner');`);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "en" });
await ctx.addCookies([{ name: "paxawa_locale", value: "en", domain: "localhost", path: "/" }, { name: "paxawa_tz", value: "Asia/Kuala_Lumpur", domain: "localhost", path: "/" }]);
const page = await ctx.newPage();
const url = mode === "itin" ? `${BASE}/trips/${TRIP}/itinerary` : `${BASE}/trips/${TRIP}`;
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(6000);
await page.evaluate(() => { for (const b of document.querySelectorAll("button")) if (/^(Decline|Allow)$/.test(b.textContent?.trim() ?? "")) { b.click(); break; } });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/${mode}-0.png` });
const cdp = await ctx.newCDPSession(page);
async function touchDrag(x, y0, y1, steps = 12, holdMs = 0) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  if (holdMs) await page.waitForTimeout(holdMs);
  for (let i = 1; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await page.waitForTimeout(16);
    if (i % 4 === 0) await page.screenshot({ path: `${OUT}/${mode}-drag-${Date.now() % 100000}.png` });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
// find sheet geometry
const info = await page.evaluate(() => {
  const els = [...document.querySelectorAll("div,button")].filter(e => /cursor-grab/.test(e.className));
  return els.map(e => { const r = e.getBoundingClientRect(); return { cls: e.className.slice(0, 60), x: r.x, y: r.y, w: r.width, h: r.height }; });
});
console.log(JSON.stringify(info, null, 1));
const h = info[0];
if (h) {
  // 1) drag from handle down
  await touchDrag(h.x + h.w / 2, h.y + h.h / 2, h.y + h.h / 2 + 300);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${mode}-1-after-down.png` });
  const info2 = await page.evaluate(() => { const e = [...document.querySelectorAll("div,button")].find(e => /cursor-grab/.test(e.className)); const r = e.getBoundingClientRect(); return { y: r.y, h: r.height }; });
  console.log("after down", info2);
  await touchDrag(195, info2.y + info2.h / 2, info2.y + info2.h / 2 - 350);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${mode}-2-after-up.png` });
  // 2) drag starting 40px BELOW handle (on content) — does it drag?
  const info3 = await page.evaluate(() => { const e = [...document.querySelectorAll("div,button")].find(e => /cursor-grab/.test(e.className)); const r = e.getBoundingClientRect(); return { y: r.y, h: r.height }; });
  console.log("elementFromPoint", await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + "." + String(e.className).slice(0, 80) + " | zone:" + !!e.closest("[style*='touch-action: none']") : null; }, [195, info3.y + 60]));
  await touchDrag(195, info3.y + 60, info3.y + 60 + 300);
  const info4 = await page.evaluate(() => { const e = [...document.querySelectorAll("div,button")].find(e => /cursor-grab/.test(e.className)); const r = e.getBoundingClientRect(); return { y: r.y, h: r.height }; });
  console.log("after content down", info4);
  // 3) tap on the ticket (if any) — must navigate/click, not drag
  const tk = await page.evaluate(() => { const e = document.querySelector(".ticket"); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2, href: e.getAttribute("href") }; });
  console.log("ticket", tk);
  if (tk) {
    // drag from ticket up 300 → sheet should move, and NOT navigate
    await touchDrag(tk.x, tk.y, tk.y - 300);
    await page.waitForTimeout(700);
    console.log("url after drag-from-ticket", page.url());
    await page.screenshot({ path: `${OUT}/${mode}-4-after-ticket-drag.png` });
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${mode}-3-after-content-down.png` });
}
await browser.close();
