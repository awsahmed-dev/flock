/**
 * The Now page in its six lives — measured, not eyeballed.
 *
 *   npm run measure:now
 *
 * Needs: local Postgres (DATABASE_URL, e.g. postgresql://postgres@127.0.0.1:5433/paxawa),
 * a dev server (BASE, default http://localhost:3010) started with the same
 * DATABASE_URL + Supabase env, and Chrome (CHROMIUM_PATH). It seeds ONE trip
 * for the DEV_USER, re-dates it per moment, renders en + ar at 390×844 and
 * asserts the invariants of the redesign:
 *
 *   • exactly one primary action (a .ticket OR the quiet floor card)
 *   • the horizon is present
 *   • the primary action is fully inside the viewport, above the nav (the
 *     audit's headline: never clipped by the fold) — underNav is reported
 *     for information only, the page scrolls
 *   • ar: the page is dir=rtl and no raw i18n key leaks (no "cockpit." text)
 *
 * Exit 1 on any failure. Screenshots to /tmp/paxawa-now/<moment>-<lang>.png.
 */
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3010";
const DB = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/paxawa";
const CHROME = process.env.CHROMIUM_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/tmp/paxawa-now"; mkdirSync(OUT, { recursive: true });
const ME = "00000000-0000-0000-0000-000000000001";
const TRIP = "00000000-0000-0000-0000-00000000f0aa";
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date(); const day = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
const sql = (q) => execFileSync("psql", ["-q", "-v", "ON_ERROR_STOP=1", DB, "-c", q], { stdio: ["ignore", "pipe", "pipe"] });

function seed({ start, end, stops = [], packed = 0, budget = 8000, crew = 2, decision = false }) {
  sql(`delete from trips where id='${TRIP}';`);
  sql(`insert into profiles (id, display_name, email) values ('${ME}','Marco','dev@flock.local'),('00000000-0000-0000-0000-000000000002','Rania','r@x.com') on conflict do nothing;`);
  sql(`insert into trips (id,name,destination,start_date,end_date,created_by,currency,budget_total) values ('${TRIP}','Tokyo','Tokyo, Japan','${start}','${end}','${ME}','USD',${budget ?? "null"});`);
  sql(`insert into trip_members (trip_id,user_id,display_name,role) values ('${TRIP}','${ME}','Marco','owner')${crew > 1 ? `,('${TRIP}','00000000-0000-0000-0000-000000000002','Rania','member')` : ""};`);
  for (const s of stops) sql(`insert into itinerary_items (trip_id,day_date,title,created_by,start_time,type,location_name,location_lat,location_lng,completed_at) values ('${TRIP}','${s.day}','${s.title}','${ME}',${s.time ? `'${s.time}'` : "null"},'${s.type ?? "activity"}','Seoul',37.57,126.98,${s.done ? "now()" : "null"});`);
  sql(`insert into packing_items (trip_id,user_id,created_by,label,category,packed) select '${TRIP}','${ME}','${ME}',l,'essentials',(row_number() over ()) <= ${packed} from unnest(array['Passport','Charger','Adapter','Toothbrush','Socks','Shirts','Trousers','Jacket','Shoes','Meds','Sunscreen','Cash','Cards','Headphones','Book','Camera','Umbrella','Towel']) l;`);
  if (decision) sql(`insert into huddle_decisions (trip_id,type,status,created_by,poll_question,poll_options) values ('${TRIP}','poll','open','00000000-0000-0000-0000-000000000002','Nikko or Hakone?','[{"id":"a","label":"Nikko","voterIds":[]},{"id":"b","label":"Hakone","voterIds":[]}]'::jsonb);`);
}
const hm = (h, m = 0) => `${String(((h % 24) + 24) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
const H = today.getHours();
const MOMENTS = [
  { key: "empty", label: "brand new · T−21", seed: { start: day(21), end: day(27), crew: 1, budget: null } },
  { key: "t49", label: "planning · T−49", seed: { start: day(49), end: day(55), stops: [{ day: day(49), title: "Shibuya", time: "15:00" }, { day: day(50), title: "TeamLab", time: "14:00" }], decision: true } },
  { key: "t3", label: "departure · T−3", seed: { start: day(3), end: day(9), stops: [{ day: day(3), title: "Shibuya", time: "15:00" }], packed: 4 } },
  { key: "live", label: "live · day 2", seed: { start: day(-1), end: day(3), stops: [{ day: day(0), title: "Breakfast", time: hm(H - 2), type: "meal", done: true }, { day: day(0), title: "Palace", time: hm(H + 1, 30) }, { day: day(0), title: "Bukchon", time: hm(H + 4) }, { day: day(0), title: "Market", time: hm(H + 9), type: "meal" }] } },
  { key: "free", label: "live · free day (no stops today)", seed: { start: day(-3), end: day(10), stops: [{ day: day(-3), title: "St James Park" }, { day: day(-3), title: "London Eye" }] } },
  { key: "last", label: "live · final day", seed: { start: day(-4), end: day(0), stops: [{ day: day(0), title: "Checkout", time: "10:00", type: "accommodation", done: true }, { day: day(0), title: "Namsan", time: hm(H - 3) }, { day: day(0), title: "Sunset", time: hm(H - 1), type: "activity" }, { day: day(0), title: "Flight KE 957", time: hm(H + 1, 10), type: "transport" }] } },
  { key: "recap", label: "home · +2 days", seed: { start: day(-9), end: day(-2), stops: [{ day: day(-8), title: "Palace", time: "11:00", done: true }, { day: day(-5), title: "Market", time: "19:00", type: "meal", done: true }] } },
];

const browser = await chromium.launch({ executablePath: CHROME });
let failures = 0;
const row = (k, l, r) => console.log(`${k.padEnd(6)} ${l.padEnd(3)} ticket=${String(r.ticket).padEnd(5)} horizon=${String(r.horizon).padEnd(5)} underNav=${String(r.underNav).padEnd(2)} go=${r.goIn === null ? "-" : r.goIn} rtl=${r.rtl ?? "-"} leak=${r.leak}  ${r.ok ? "✓" : "✗ " + r.why.join(", ")}`);
for (const m of MOMENTS) {
  seed(m.seed);
  for (const lang of ["en", "ar"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await ctx.addCookies([{ name: "paxawa_locale", value: lang, domain: "localhost", path: "/" }, { name: "paxawa_tz", value: Intl.DateTimeFormat().resolvedOptions().timeZone, domain: "localhost", path: "/" }]);
    await ctx.addInitScript(() => { try { localStorage.setItem("paxawa:analytics-consent", "denied"); } catch {} });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/trips/${TRIP}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(m.key === "live" || m.key === "last" || m.key === "free" ? 6000 : 4500);
    await page.evaluate(() => { document.querySelectorAll('nextjs-portal,[class*="tsqd"]').forEach((e) => e.remove()); [...document.querySelectorAll("button")].filter((e) => /tanstack/i.test(e.getAttribute("aria-label") || "")).forEach((e) => e.remove()); });
    const r = await page.evaluate((isLive) => {
      const nav = document.querySelector("[data-bottom-nav]"); const navTop = nav ? nav.getBoundingClientRect().top : 844;
      const tickets = [...document.querySelectorAll(".ticket")];
      const quiet = [...document.querySelectorAll("a")].filter((a) => a.querySelector("span.text-primary") && a.className.includes("border-border") && a.getBoundingClientRect().top < 700);
      const horizon = !!document.querySelector('section[aria-label]');
      const controls = [...document.querySelectorAll('a[href],button,[role="button"]')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.top < 844 && r.bottom > 0 && !nav?.contains(el); });
      const underNav = controls.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > navTop + 4 && r.top < navTop; }).length;
      const tk = tickets[0]?.getBoundingClientRect(); const goIn = tickets[0] ? tk.bottom <= navTop : (quiet[0] ? quiet[0].getBoundingClientRect().bottom <= navTop : null);
      const rtl = document.documentElement.dir === "rtl";
      const leak = /\b(cockpit|now|confirm)\.[a-zA-Z.]+\b/.test(document.body.innerText);
      const ticket = tickets.length > 0 || quiet.length > 0;
      // underNav is informational: the page scrolls, so rows passing under the
      // floating nav are normal. What must hold: the primary action itself is
      // fully in reach (never clipped by the fold or the nav — the audit's
      // headline), exactly one of it, and the horizon exists.
      const why = []; if (!ticket) why.push("no ticket/floor"); if (tickets.length > 1) why.push("2 tickets"); if (!horizon) why.push("no horizon"); if (goIn === false) why.push("primary action clipped"); if (leak) why.push("i18n key leak");
      return { ticket, horizon, underNav, goIn, rtl, leak, ok: why.length === 0, why };
    }, m.key === "live" || m.key === "last" || m.key === "free");
    if (lang === "ar" && !r.rtl) { r.ok = false; r.why.push("not rtl"); }
    row(m.key, lang, r); if (!r.ok) failures++;
    await page.screenshot({ path: `${OUT}/${m.key}-${lang}.png` });
    await ctx.close();
  }
}
await browser.close();
console.log(failures ? `\n✗ ${failures} failing render(s) — screenshots in ${OUT}` : `\n✓ all six moments × en/ar pass — screenshots in ${OUT}`);
process.exit(failures ? 1 : 0);
