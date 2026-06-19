// scripts/capture-case-shots.mjs
//
// Captures real screenshots of paxawa.com surfaces and writes them
// into public/case/img/ so the case-study HTML can <img> them.
//
// First run: launches a visible Chrome with a persistent profile —
// log in manually one time. Subsequent runs reuse the saved profile
// and capture everything headlessly.
//
// Usage:
//   node scripts/capture-case-shots.mjs            # capture all
//   node scripts/capture-case-shots.mjs --visible  # show browser
//   node scripts/capture-case-shots.mjs --login    # open for login

import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public/case/img");
const PROFILE_DIR = path.join(PROJECT_ROOT, ".case-puppet-profile");

const flags = new Set(process.argv.slice(2));
const VISIBLE = flags.has("--visible") || flags.has("--login");
const LOGIN_ONLY = flags.has("--login");

// Trip ids — these correspond to live data on paxawa.com.
const MALAYSIA = "a8f2471e-62fa-4c63-aea5-1d7348d52c2f";
const JAPAN    = "cc3d284a-c5f9-46ff-9fbf-d197de752fd3";

// ── Shot recipes ──────────────────────────────────────────────────────
//
// Each entry describes one screenshot: url, viewport, optional
// `prepare` (mutate the page before capturing), and the output file.
// Mobile shots are 390x844, desktop shots are 1440x900.

const MOBILE = { width: 390,  height: 844, deviceScaleFactor: 2 };
const DESK   = { width: 1440, height: 900, deviceScaleFactor: 2 };

const shots = [
  // ── Dashboard ──
  { file: "dashboard-desktop.png", url: "/dashboard", vp: DESK,   wait: 2500 },
  { file: "dashboard-mobile.png",  url: "/dashboard", vp: MOBILE, wait: 2500 },

  // ── Trip overview ──
  { file: "overview-malaysia-desktop.png", url: `/trips/${MALAYSIA}`, vp: DESK,   wait: 2500 },
  { file: "overview-malaysia-mobile.png",  url: `/trips/${MALAYSIA}`, vp: MOBILE, wait: 2500 },
  { file: "overview-japan-mobile.png",     url: `/trips/${JAPAN}`,    vp: MOBILE, wait: 2500 },

  // ── Itinerary (real map) ──
  {
    file: "itinerary-malaysia-desktop.png",
    url:  `/trips/${MALAYSIA}/itinerary`,
    vp:   DESK,
    wait: 6500, // map tiles need time
  },
  {
    file: "itinerary-malaysia-mobile.png",
    url:  `/trips/${MALAYSIA}/itinerary`,
    vp:   MOBILE,
    wait: 6500,
  },

  // ── Votes ──
  { file: "votes-malaysia-mobile.png", url: `/trips/${MALAYSIA}/votes`, vp: MOBILE, wait: 2500 },
  { file: "votes-malaysia-desktop.png", url: `/trips/${MALAYSIA}/votes`, vp: DESK, wait: 2500 },

  // ── Expenses ──
  { file: "expenses-japan-desktop.png", url: `/trips/${JAPAN}/expenses`, vp: DESK,   wait: 3000 },
  { file: "expenses-japan-mobile.png",  url: `/trips/${JAPAN}/expenses`, vp: MOBILE, wait: 3000 },
  {
    file: "expenses-breakdown-japan.png",
    url:  `/trips/${JAPAN}/expenses`,
    vp:   DESK,
    wait: 3000,
    prepare: async (page) => {
      // scroll to the spending-breakdown + balances section
      await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
      await new Promise(r => setTimeout(r, 600));
    },
  },

  // ── Pack ──
  { file: "pack-malaysia-mobile.png",  url: `/trips/${MALAYSIA}/pack?view=packing`, vp: MOBILE, wait: 2500 },
  { file: "pack-malaysia-desktop.png", url: `/trips/${MALAYSIA}/pack?view=packing`, vp: DESK,   wait: 2500 },

  // ── Chat ──
  { file: "chat-japan-desktop.png", url: `/trips/${JAPAN}/chat`, vp: DESK,   wait: 3000 },
  { file: "chat-japan-mobile.png",  url: `/trips/${JAPAN}/chat`, vp: MOBILE, wait: 3000 },

  // ── Notification settings ──
  { file: "notif-settings-desktop.png", url: "/account/notifications", vp: DESK, wait: 1800 },

  // ── Expenses sub-pages (transactions, balances, breakdown) ──
  { file: "expenses-transactions-desktop.png", url: `/trips/${JAPAN}/expenses/transactions`, vp: DESK, wait: 3000 },
  { file: "expenses-balances-desktop.png",     url: `/trips/${JAPAN}/expenses/balances`,     vp: DESK, wait: 3000 },
  { file: "expenses-breakdown-page-desktop.png", url: `/trips/${JAPAN}/expenses/breakdown`,  vp: DESK, wait: 3000 },

  // ── Members / Crew ──
  { file: "members-malaysia-desktop.png", url: `/trips/${MALAYSIA}/members`, vp: DESK, wait: 2500 },

  // ── Discover / AI Plan landing ──
  { file: "discover-malaysia-desktop.png", url: `/trips/${MALAYSIA}/discover`, vp: DESK, wait: 3000 },

  // ── Create trip form ──
  { file: "new-trip-desktop.png", url: "/trips/new", vp: DESK, wait: 1500 },

  // ── Trip settings ──
  { file: "settings-malaysia-desktop.png", url: `/trips/${MALAYSIA}/settings`, vp: DESK, wait: 2000 },

  // ── Trip overview with the notification bell dropdown opened ──
  {
    file: "notif-bell-open-desktop.png",
    url:  `/trips/${MALAYSIA}`,
    vp:   DESK,
    wait: 3000,
    prepare: async (page) => {
      // Open the notification bell dropdown if visible
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button[title], button[aria-label]'));
        const bell = btns.find(b => /notification|bell/i.test((b.getAttribute('title') || '') + ' ' + (b.getAttribute('aria-label') || '')));
        if (bell) bell.click();
      });
      await new Promise(r => setTimeout(r, 600));
    },
  },

  // ── Log expense dialog opened ──
  {
    file: "log-expense-dialog-desktop.png",
    url:  `/trips/${MALAYSIA}/expenses`,
    vp:   DESK,
    wait: 3000,
    prepare: async (page) => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const log = btns.find(b => /log expense/i.test(b.textContent || ''));
        if (log) log.click();
      });
      await new Promise(r => setTimeout(r, 800));
    },
  },

  // ── Create vote dialog opened ──
  {
    file: "create-vote-dialog-desktop.png",
    url:  `/trips/${MALAYSIA}/votes`,
    vp:   DESK,
    wait: 2000,
    prepare: async (page) => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const newVote = btns.find(b => /new vote/i.test(b.textContent || ''));
        if (newVote) newVote.click();
      });
      await new Promise(r => setTimeout(r, 600));
    },
  },

  // ── AI Trip Planner side panel opened ──
  {
    file: "ai-plan-panel-desktop.png",
    url:  `/trips/${MALAYSIA}/itinerary`,
    vp:   DESK,
    wait: 6500,
    prepare: async (page) => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const ai = btns.find(b => /AI Plan/i.test(b.textContent || ''));
        if (ai) ai.click();
      });
      await new Promise(r => setTimeout(r, 1000));
    },
  },
];

async function ensureLoggedIn(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto("https://paxawa.com/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  // Give it a beat to let the redirect happen if not logged in.
  await new Promise(r => setTimeout(r, 1500));

  const url = page.url();
  const isLogin = url.includes("/auth") || url === "https://paxawa.com/";
  if (isLogin) {
    console.log("\n  ▸ Not logged in. Sign in inside the open browser window.");
    console.log("    Take your time — this terminal will wait up to 10 min.\n");
    if (!VISIBLE) {
      console.log("    Tip: re-run with --login to see the browser window.\n");
      await page.close();
      return false;
    }
    // Poll for redirect to /dashboard rather than waitForFunction which
    // bails on cross-document navigation.
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        if (page.url().endsWith("/dashboard")) break;
      } catch {}
    }
    if (!page.url().endsWith("/dashboard")) {
      console.log("  ✗ Timed out waiting for login. Re-run and try again.");
      await page.close();
      return false;
    }
    console.log("  ✔ Login detected.\n");
  }
  await page.close();
  return true;
}

async function takeShot(browser, recipe) {
  const page = await browser.newPage();
  try {
    await page.setViewport(recipe.vp);
    // Seed localStorage so the analytics-consent banner stays hidden
    // and the chat sidebar resolves to its persisted state.
    await page.goto("https://paxawa.com/__about:blank__", { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
    // Need an origin to set localStorage. Hit the dashboard first
    // (cheap, cached), set storage, then go to the target page.
    await page.goto("https://paxawa.com/dashboard", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.evaluate(() => {
      try { localStorage.setItem("paxawa:analytics-consent", "granted"); } catch {}
    });

    await page.goto(`https://paxawa.com${recipe.url}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (recipe.wait) await new Promise(r => setTimeout(r, recipe.wait));
    // Belt-and-braces: hide the cookie/consent banner + feedback widget
    // via DOM in case the storage seed didn't take for this page.
    await page.evaluate(() => {
      // The cookie banner targets aria-labelledby="cookie-banner-title".
      document.querySelectorAll('[aria-labelledby="cookie-banner-title"]').forEach(el => el.remove());
      // Fallback: any fixed-positioned element at bottom-right with
      // the consent copy.
      document.querySelectorAll('div').forEach(el => {
        const t = (el.textContent || "").slice(0, 200);
        if (/Help us build a better product/i.test(t) && /Allow/.test(t) && /Decline/.test(t)) {
          el.style.display = "none";
        }
      });
      // Hide the Feedback widget in the bottom-right corner too.
      document.querySelectorAll('button, div').forEach(el => {
        const t = el.textContent || "";
        if (t.trim() === "Feedback" || /feedback-widget/i.test(el.className || "")) {
          const style = window.getComputedStyle(el);
          if (style.position === "fixed" || el.closest('[class*="fixed"]')) el.style.display = "none";
        }
      });
    }).catch(() => {});
    if (recipe.prepare) await recipe.prepare(page);

    const outPath = path.join(OUT_DIR, recipe.file);
    await page.screenshot({ path: outPath, type: "png" });
    console.log(`  ✔ ${recipe.file}`);
  } catch (err) {
    console.error(`  ✗ ${recipe.file}: ${err.message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(PROFILE_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: !VISIBLE,
    userDataDir: PROFILE_DIR,
    defaultViewport: null,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  });

  try {
    const ok = await ensureLoggedIn(browser);
    if (!ok || LOGIN_ONLY) {
      await browser.close();
      if (LOGIN_ONLY) console.log("Re-run without --login to capture.\n");
      return;
    }

    console.log(`\nCapturing ${shots.length} screenshots → ${path.relative(PROJECT_ROOT, OUT_DIR)}\n`);
    for (const recipe of shots) {
      await takeShot(browser, recipe);
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
