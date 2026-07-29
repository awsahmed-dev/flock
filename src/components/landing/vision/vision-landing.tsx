"use client";

/**
 * VISION CONCEPT v3 — "The page is the trip", now day-flight capable.
 *
 * - Light mode by default ("bright day" edition) with a sun/moon toggle;
 *   all chrome colors flow from one theme-token object. The phone-style
 *   demos stay dark on purpose — dark app screens floating on a bright
 *   canvas is the contrast that makes them read as *product*.
 * - Scroll choreography tightened: hero headline parallax + fade, the
 *   trip-clock rail tracks chapters via center-of-viewport progress,
 *   fill bar reaches 100% exactly at the Wrap.
 * - Boarding pass upgraded: SOLO → SAWA route board, four fields with
 *   real type scale, taller barcode.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import {
  ArrowRight,
  AirplaneTakeoff,
  Airplane,
  Sun,
  MoonStars,
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";
import { HeroAurora } from "../aurora";
import { NowDemo } from "../demos/now-demo";
import { DepartureDemo } from "../demos/departure-demo";
import { LiveDemo } from "../demos/live-demo";
import { WrapDemo } from "../demos/wrap-demo";

const PHASES = [
  { key: "planning", clock: "T−89", label: "Planning", hue: "#6D5AE6", hueDark: "#8B7CFF" },
  { key: "departure", clock: "T−7", label: "Departure", hue: "#0C7A6F", hueDark: "#3EC5B7" },
  { key: "live", clock: "DAY 3", label: "On the trip", hue: "#D06A3A", hueDark: "#FF8A5C" },
  { key: "wrap", clock: "HOME", label: "The Wrap", hue: "#8F6400", hueDark: "#E0B252" },
] as const;

interface Theme {
  canvas: string;
  text: string;
  sub: string;
  faint: string;
  card: string;
  line: string;
  nav: string;
}

const LIGHT: Theme = {
  canvas: "#F6F5F1",
  text: "#141414",
  sub: "rgba(20,20,20,0.60)",
  faint: "rgba(20,20,20,0.38)",
  card: "#FFFFFF",
  line: "rgba(20,20,20,0.09)",
  nav: "rgba(246,245,241,0.82)",
};

const DARK: Theme = {
  canvas: "#0D0D0D",
  text: "#F5F5F7",
  sub: "rgba(255,255,255,0.58)",
  faint: "rgba(255,255,255,0.36)",
  card: "#161616",
  line: "rgba(255,255,255,0.08)",
  nav: "rgba(13,13,13,0.78)",
};

function TicketStamp({
  clock,
  label,
  hue,
  t,
}: {
  clock: string;
  label: string;
  hue: string;
  t: Theme;
}) {
  return (
    <div
      className="inline-flex items-stretch rounded-xl border overflow-hidden text-[11px] font-bold tracking-[0.14em] uppercase"
      style={{ borderColor: `${hue}55`, background: `${hue}0f` }}
    >
      <span className="px-3 py-2 tabular-nums" style={{ color: hue }}>
        {clock}
      </span>
      <span
        className="border-s border-dashed px-3 py-2"
        style={{ borderColor: `${hue}55`, color: t.sub }}
      >
        {label}
      </span>
    </div>
  );
}

interface Chapter {
  phase: (typeof PHASES)[number];
  title: string;
  accent: string;
  body: string;
  pain: string;
  fix: string;
  demo: React.ReactNode;
}

const CHAPTERS: Chapter[] = [
  {
    phase: PHASES[0],
    title: "Right now it's a big beautiful maybe.",
    accent: "maybe.",
    body: "The cockpit turns maybes into a plan — readiness fills, day chips light up, and suddenly: you're going.",
    pain: "“So are we actually doing this?”",
    fix: "Yes. Decided.",
    demo: <NowDemo />,
  },
  {
    phase: PHASES[1],
    title: "One week out — usually panic o'clock.",
    accent: "panic o'clock.",
    body: "Not this time. Docs pinned, weather in, packing gaps called out by name (looking at you, Tariq).",
    pain: "“Can someone resend the Airbnb link?”",
    fix: "Pinned to day 1",
    demo: <DepartureDemo />,
  },
  {
    phase: PHASES[2],
    title: "You're there. Look up from the phone.",
    accent: "the phone.",
    body: "Today's stops on one card, the lunch bill split before dessert — even with zero bars in the metro.",
    pain: "“Who paid for the taxi?”",
    fix: "Logged, ¥3,100 each",
    demo: <LiveDemo />,
  },
  {
    phase: PHASES[3],
    title: "Don't let it end in “send pics pls”.",
    accent: "“send pics pls”.",
    body: "Photos, crew awards, the last settle-up — one Wrap so good the final message is “where next?”",
    pain: "“Send me the photos!!”",
    fix: "All in the Wrap",
    demo: <WrapDemo />,
  },
];

export function VisionLanding() {
  const [light, setLight] = useState(true);
  const t = light ? LIGHT : DARK;
  const hueOf = (p: (typeof PHASES)[number]) => (light ? p.hue : p.hueDark);

  // ── hero parallax ──
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, -90]);
  const heroOpacity = useTransform(heroProgress, [0, 0.75], [1, 0.25]);

  // ── trip clock: plain scroll listener (survives rAF throttling, works
  //    from any load position) measuring progress at viewport center ──
  const journeyRef = useRef<HTMLDivElement>(null);
  const [journeyP, setJourneyP] = useState(0);
  useEffect(() => {
    const el = journeyRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const center = window.innerHeight / 2;
      const v = (center - r.top) / r.height;
      setJourneyP(Math.min(1, Math.max(0, v)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const activeIdx = Math.min(3, Math.max(0, Math.floor(journeyP * 4 + 0.12)));
  const active = PHASES[activeIdx];
  const activeHue = hueOf(active);

  return (
    <div
      className="relative min-h-screen transition-colors duration-500"
      style={{ background: t.canvas, color: t.text }}
    >
      {/* film grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[5] mix-blend-overlay"
        style={{
          opacity: light ? 0.035 : 0.05,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <style>{`@keyframes vision-shimmer { from { background-position: 200% 0; } to { background-position: -50% 0; } }`}</style>

      {/* ── nav ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-500"
        style={{ background: t.nav, borderColor: t.line }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0" style={{ color: t.text }} aria-label="Paxawa home">
            <Logo variant="full" size="sm" />
          </Link>
          <span
            className="hidden sm:block text-[11px] font-bold tracking-[0.2em] uppercase"
            style={{ color: t.faint }}
          >
            Concept B · the page is the trip
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLight(!light)}
              aria-label={light ? "Switch to night flight" : "Switch to day flight"}
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors"
              style={{ borderColor: t.line, color: t.sub }}
            >
              {light ? <MoonStars className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#6D5AE6] text-white hover:bg-[#5B4BD9] px-4 py-2 text-sm font-bold transition-colors"
            >
              Start a trip
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── hero ────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden px-6 pt-24 sm:pt-32 pb-16 text-center">
        {!light && <HeroAurora />}
        {light && (
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 left-1/4 w-[40rem] h-[40rem] rounded-full bg-[#6D5AE6]/14 blur-[130px]" />
            <div className="absolute -top-10 right-1/4 w-[34rem] h-[34rem] rounded-full bg-[#0C7A6F]/12 blur-[120px]" />
            <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-[#E0B252]/16 blur-[110px]" />
          </div>
        )}
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative max-w-4xl mx-auto">
          <TicketStamp clock="PAX 04" label="Now boarding" hue={light ? "#6D5AE6" : "#8B7CFF"} t={t} />
          <h1 className="mt-8 text-[44px] sm:text-7xl font-semibold tracking-[-0.045em] leading-[1.02]">
            Pack <span style={{ color: light ? "#8F6400" : "#E0B252" }}>sawa</span>
            <span style={{ color: t.faint }}>.</span>
            <br />
            <span style={{ color: t.faint }}>Travel</span>{" "}
            <span style={{ color: light ? "#6D5AE6" : "#8B7CFF" }}>every phase</span>{" "}
            <span style={{ color: t.faint }}>together.</span>
          </h1>
          <p className="mt-6 text-lg max-w-xl mx-auto" style={{ color: t.sub }}>
            <span className="font-semibold" style={{ color: light ? "#8F6400" : "#E8CB86" }}>
              sawa · سوا
            </span>{" "}
            means together. A trip lives four lives — scroll, and travel them.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#6D5AE6] text-white hover:bg-[#5B4BD9] px-5 py-3 text-sm font-bold transition-colors"
            >
              Start a trip
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
            <span className="text-[13px]" style={{ color: t.faint }}>
              Free · English + العربية
            </span>
          </div>
        </motion.div>
      </section>

      {/* ── the journey ─────────────────────────────────────────────── */}
      <div ref={journeyRef} className="relative">
        {/* trip-clock rail — desktop */}
        <div className="hidden lg:block sticky top-24 h-0 z-30">
          <div className="absolute right-8 xl:right-14 top-8 flex flex-col items-center">
            <span
              className="mb-3 rounded-lg border px-2.5 py-1.5 text-[12px] font-bold tabular-nums tracking-[0.1em] transition-colors duration-500"
              style={{ color: activeHue, borderColor: `${activeHue}55`, background: `${activeHue}12` }}
            >
              {active.clock}
            </span>
            <div
              className="relative w-px h-64 overflow-hidden rounded-full"
              style={{ background: t.line }}
            >
              <div
                className="absolute top-0 inset-x-0 w-full transition-[height,background-color] duration-300 ease-out"
                style={{ height: `${Math.round(journeyP * 100)}%`, background: activeHue }}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {PHASES.map((p, i) => (
                <span
                  key={p.key}
                  className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    background: i <= activeIdx ? hueOf(p) : t.line,
                    boxShadow: i === activeIdx ? `0 0 12px ${hueOf(p)}90` : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {CHAPTERS.map((c, i) => (
          <ChapterScene
            key={c.phase.key}
            c={c}
            i={i}
            t={t}
            light={light}
            hue={light ? c.phase.hue : c.phase.hueDark}
          />
        ))}
      </div>

      {/* ── boarding pass ───────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-8"
            style={{ color: t.faint }}
          >
            Your boarding pass
          </p>
          <Link href="/auth/signup" className="group block">
            <div
              className="relative rounded-[28px] border overflow-hidden transition-all duration-300 group-hover:-translate-y-1.5"
              style={{
                background: t.card,
                borderColor: light ? "rgba(109,90,230,0.35)" : "rgba(139,124,255,0.4)",
                boxShadow: light
                  ? "0 12px 40px -12px rgba(20,20,20,0.18), 0 30px 80px -30px rgba(109,90,230,0.35)"
                  : "0 20px 60px -20px rgba(139,124,255,0.35)",
              }}
            >
              {/* holographic shimmer */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 40%, rgba(109,90,230,0.10) 46%, rgba(12,122,111,0.09) 52%, rgba(224,178,82,0.10) 58%, transparent 64%)",
                  backgroundSize: "250% 100%",
                  animation: "vision-shimmer 2.4s linear infinite",
                }}
              />
              {/* seam notches */}
              <div
                aria-hidden
                className="absolute top-[62%] -translate-y-1/2 -left-3.5 w-7 h-7 rounded-full border"
                style={{ background: t.canvas, borderColor: light ? "rgba(109,90,230,0.35)" : "rgba(139,124,255,0.4)" }}
              />
              <div
                aria-hidden
                className="absolute top-[62%] -translate-y-1/2 -right-3.5 w-7 h-7 rounded-full border"
                style={{ background: t.canvas, borderColor: light ? "rgba(109,90,230,0.35)" : "rgba(139,124,255,0.4)" }}
              />

              <div className="p-7 sm:p-10">
                {/* airline header */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2" style={{ color: light ? "#6D5AE6" : "#B3A8FF" }}>
                    <AirplaneTakeoff className="w-5 h-5" />
                    <span className="text-[12px] font-bold tracking-[0.22em] uppercase">
                      Paxawa Air
                    </span>
                  </div>
                  <span
                    className="text-[12px] font-bold tracking-[0.18em] uppercase"
                    style={{ color: light ? "#8F6400" : "#E8CB86" }}
                  >
                    Pack sawa · نروح سوا
                  </span>
                </div>

                {/* route board: SOLO → SAWA */}
                <div className="mt-8 flex items-center justify-between gap-4">
                  <div className="text-start">
                    <p className="text-4xl sm:text-6xl font-semibold tracking-[-0.04em] leading-none">
                      SOLO
                    </p>
                    <p className="mt-2 text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: t.faint }}>
                      Planning alone
                    </p>
                  </div>
                  <div className="flex-1 relative h-px mx-2" style={{ background: "transparent" }}>
                    <div
                      aria-hidden
                      className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-px"
                      style={{
                        backgroundImage: `repeating-linear-gradient(to right, ${light ? "#6D5AE6" : "#8B7CFF"}66 0 8px, transparent 8px 16px)`,
                      }}
                    />
                    <Airplane
                      weight="fill"
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rotate-90 transition-transform duration-500 group-hover:translate-x-2"
                      style={{ color: light ? "#6D5AE6" : "#8B7CFF" }}
                    />
                  </div>
                  <div className="text-end">
                    <p
                      className="text-4xl sm:text-6xl font-semibold tracking-[-0.04em] leading-none"
                      style={{ color: light ? "#8F6400" : "#E0B252" }}
                    >
                      SAWA
                    </p>
                    <p className="mt-2 text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: t.faint }}>
                      Together · سوا
                    </p>
                  </div>
                </div>

                {/* fields */}
                <div className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-5 text-start">
                  {[
                    { k: "Pax", v: "You + crew" },
                    { k: "Fare", v: "Free" },
                    { k: "Gate", v: "paxawa.com" },
                    { k: "Departs", v: "Anytime" },
                  ].map((f) => (
                    <div key={f.k}>
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: t.faint }}>
                        {f.k}
                      </p>
                      <p className="mt-1.5 text-base sm:text-lg font-bold" style={{ color: t.text }}>
                        {f.v}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* dashed seam + stub */}
              <div
                className="border-t border-dashed px-7 sm:px-10 py-6 flex items-center justify-between gap-6"
                style={{ borderColor: light ? "rgba(109,90,230,0.3)" : "rgba(139,124,255,0.35)" }}
              >
                <div aria-hidden className="flex items-end gap-[3px] h-11 opacity-80">
                  {[2, 5, 3, 7, 2, 4, 6, 2, 3, 8, 2, 5, 3, 2, 6, 4, 2, 7, 3, 5, 2, 4, 8, 2, 3, 6, 2, 4].map(
                    (w, i) => (
                      <span
                        key={i}
                        style={{
                          width: w >= 5 ? 3 : 1.5,
                          height: "100%",
                          background: light ? "rgba(20,20,20,0.75)" : "rgba(255,255,255,0.7)",
                        }}
                      />
                    ),
                  )}
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#6D5AE6] text-white px-6 py-3 text-base font-bold transition-colors group-hover:bg-[#5B4BD9]">
                  Board now
                  <ArrowRight style={{ width: 18, height: 18 }} className="rtl:rotate-180 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
          <p className="mt-6 text-center text-[13px]" style={{ color: t.faint }}>
            Two-minute setup · the crew joins with one link
          </p>
        </div>
      </section>

      <footer className="border-t py-10 px-6" style={{ borderColor: t.line }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs" style={{ color: t.faint }}>
          <span>© {new Date().getFullYear()} Paxawa — Pack sawa · نروح سوا</span>
          <Link href="/" className="transition-colors hover:opacity-70">
            ← Current landing
          </Link>
        </div>
      </footer>
    </div>
  );
}


/**
 * Apple-style pinned scene: the chapter locks to the viewport for
 * ~2.6 screen-heights while scroll scrubs the demo through its frames,
 * then releases and the next chapter pushes in.
 */
function ChapterScene({
  c,
  i,
  t,
  light,
  hue,
}: {
  c: Chapter;
  i: number;
  t: Theme;
  light: boolean;
  hue: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const v = total <= 0 ? 0 : -r.top / total;
      // quantize to 2.5% steps → ~40 renders per scene, not per pixel
      setP(Math.round(Math.min(1, Math.max(0, v)) * 40) / 40);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  // demo frames run from 10% → 88% of the pin; copy leads, pain chip lands last
  const demoP = Math.min(1, Math.max(0, (p - 0.08) / 0.78));
  const lead = c.title.slice(0, c.title.length - c.accent.length);

  const demo =
    c.phase.key === "planning" ? (
      <NowDemo progress={demoP} />
    ) : c.phase.key === "departure" ? (
      <DepartureDemo progress={demoP} />
    ) : c.phase.key === "live" ? (
      <LiveDemo progress={demoP} />
    ) : (
      <WrapDemo progress={demoP} />
    );

  return (
    <div ref={ref} className="relative h-[260vh]">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        {/* phase-tinted zone */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: p > 0.02 ? 1 : 0,
            background: `radial-gradient(70% 60% at ${i % 2 === 0 ? "15%" : "85%"} 50%, ${hue}${light ? "16" : "12"}, transparent 70%)`,
          }}
        />
        <div
          className={`relative w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 lg:gap-20 items-center ${
            i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <div>
            <motion.div
              initial={false}
              animate={p > 0.02 ? { opacity: 1, x: 0 } : { opacity: 0, x: i % 2 === 0 ? -14 : 14 }}
              transition={{ duration: 0.4 }}
            >
              <TicketStamp clock={c.phase.clock} label={c.phase.label} hue={hue} t={t} />
            </motion.div>
            <motion.h2
              initial={false}
              animate={p > 0.04 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.45 }}
              className="mt-6 text-3xl sm:text-5xl font-semibold tracking-[-0.04em] leading-[1.05] max-w-md"
            >
              {lead}
              <span style={{ color: hue }}>{c.accent}</span>
            </motion.h2>
            <motion.p
              initial={false}
              animate={p > 0.08 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.45 }}
              className="mt-5 text-base sm:text-lg leading-relaxed max-w-md"
              style={{ color: t.sub }}
            >
              {c.body}
            </motion.p>
            <motion.div
              initial={false}
              animate={p > 0.82 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.35 }}
              className="mt-6 inline-flex items-center gap-2.5 rounded-full border ps-4 pe-1.5 py-1.5"
              style={{ borderColor: t.line, background: t.card }}
            >
              <span className="text-[13px] line-through" style={{ color: t.faint }}>
                {c.pain}
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ color: hue, background: `${hue}14`, border: `1px solid ${hue}40` }}
              >
                {c.fix}
              </span>
            </motion.div>
            {/* scene progress ticks — tells the visitor the scene scrubs */}
            <div className="mt-8 flex items-center gap-1.5">
              {[0, 1, 2, 3].map((n) => (
                <span
                  key={n}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: demoP >= (n + 1) / 4 ? 22 : 10,
                    background: demoP >= (n + 1) / 4 ? hue : t.line,
                  }}
                />
              ))}
            </div>
          </div>

          <motion.div
            initial={false}
            animate={p > 0.03 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.5 }}
            className="rounded-[24px]"
            style={{ boxShadow: `0 40px 120px -45px ${hue}${light ? "70" : "66"}` }}
          >
            {demo}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
