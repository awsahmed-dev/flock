"use client";

/**
 * VISION CONCEPT C — "autoplay flight".
 *
 * Same trip-journey story as /vision, but each chapter's mockup PLAYS
 * itself: when a chapter scrolls into view, a ~3.5s timer sweeps the
 * demo through its frames (readiness fills, rows check off, stops
 * complete) — no pinning, normal page height, skimmable at speed.
 * Scroll fast and chapters still finish their little movies; scroll
 * back and they stay completed.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Play, Sun, MoonStars } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";
import {
  PHASES,
  LIGHT,
  DARK,
  type Theme,
  type Chapter,
  TicketStamp,
  CHAPTERS,
  BoardingPass,
} from "./vision-landing";
import { NowDemo } from "../demos/now-demo";
import { DepartureDemo } from "../demos/departure-demo";
import { LiveDemo } from "../demos/live-demo";
import { WrapDemo } from "../demos/wrap-demo";

const PLAY_MS = 3500;
const TICK_MS = 40;

export function VisionFlowLanding() {
  const [light, setLight] = useState(true);
  const t = light ? LIGHT : DARK;
  const hueOf = (p: (typeof PHASES)[number]) => (light ? p.hue : p.hueDark);

  // trip-clock rail — same plain-listener pattern as /vision
  const journeyRef = useRef<HTMLDivElement>(null);
  const [journeyP, setJourneyP] = useState(0);
  useEffect(() => {
    const el = journeyRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const v = (window.innerHeight / 2 - r.top) / r.height;
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
      <style>{`@keyframes vision-shimmer { from { background-position: 200% 0; } to { background-position: -50% 0; } }`}</style>

      {/* nav */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-500"
        style={{ background: t.nav, borderColor: t.line }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0" style={{ color: t.text }} aria-label="Paxawa home">
            <Logo variant="full" size="sm" />
          </Link>
          <span className="hidden sm:block text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: t.faint }}>
            Concept C · autoplay flight
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLight(!light)}
              aria-label={light ? "Night flight" : "Day flight"}
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

      {/* ── trailer hero: the whole trip plays on loop ─────────────── */}
      <HeroTrailer t={t} light={light} />

      {/* journey — normal height, autoplaying chapters */}
      <div ref={journeyRef} className="relative">
        {/* trip-clock rail */}
        <div className="hidden lg:block sticky top-24 h-0 z-30">
          <div className="absolute right-8 xl:right-14 top-8 flex flex-col items-center">
            <span
              className="mb-3 rounded-lg border px-2.5 py-1.5 text-[12px] font-bold tabular-nums tracking-[0.1em] transition-colors duration-500"
              style={{ color: activeHue, borderColor: `${activeHue}55`, background: `${activeHue}12` }}
            >
              {active.clock}
            </span>
            <div className="relative w-px h-48 overflow-hidden rounded-full" style={{ background: t.line }}>
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
          <AutoChapter key={c.phase.key} c={c} i={i} t={t} light={light} hue={hueOf(c.phase)} />
        ))}
      </div>

      <BoardingPass t={t} light={light} />

      <footer className="border-t py-10 px-6" style={{ borderColor: t.line }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs" style={{ color: t.faint }}>
          <span>© {new Date().getFullYear()} Paxawa — Pack sawa · نروح سوا</span>
          <nav className="flex items-center gap-4">
            <Link href="/vision" className="transition-colors hover:opacity-70">
              Concept B (scrub)
            </Link>
            <Link href="/" className="transition-colors hover:opacity-70">
              ← Current landing
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/**
 * Autoplaying chapter: an IntersectionObserver arms it, a timer sweeps
 * progress 0→1 over PLAY_MS. Plays once and stays completed; a replay
 * button lets the curious run the movie again.
 */
function AutoChapter({
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
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const [played, setPlayed] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const play = () => {
    if (timer.current) clearInterval(timer.current);
    setP(0);
    const startedAt = performance.now();
    timer.current = setInterval(() => {
      const v = Math.min(1, (performance.now() - startedAt) / PLAY_MS);
      setP(Math.round(v * 50) / 50);
      if (v >= 1 && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
        setPlayed(true);
      }
    }, TICK_MS);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !played && !timer.current) play();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [played]);

  const lead = c.title.slice(0, c.title.length - c.accent.length);
  const demo =
    c.phase.key === "planning" ? (
      <NowDemo progress={p} />
    ) : c.phase.key === "departure" ? (
      <DepartureDemo progress={p} />
    ) : c.phase.key === "live" ? (
      <LiveDemo progress={p} />
    ) : (
      <WrapDemo progress={p} />
    );

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          opacity: p > 0 ? 1 : 0,
          background: `radial-gradient(70% 60% at ${i % 2 === 0 ? "15%" : "85%"} 50%, ${hue}${light ? "16" : "12"}, transparent 70%)`,
        }}
      />
      <div
        className={`relative max-w-7xl mx-auto px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-20 items-center ${
          i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div>
          <motion.div
            initial={{ opacity: 0, x: i % 2 === 0 ? -14 : 14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <TicketStamp clock={c.phase.clock} label={c.phase.label} hue={hue} t={t} />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mt-6 text-3xl sm:text-5xl font-semibold tracking-[-0.04em] leading-[1.05] max-w-md"
          >
            {lead}
            <span style={{ color: hue }}>{c.accent}</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-5 text-base sm:text-lg leading-relaxed max-w-md"
            style={{ color: t.sub }}
          >
            {c.body}
          </motion.p>

          {/* pain chip lands when the movie ends */}
          <div
            className="mt-6 inline-flex items-center gap-2.5 rounded-full border ps-4 pe-1.5 py-1.5 transition-all duration-500"
            style={{
              borderColor: t.line,
              background: t.card,
              opacity: p >= 0.96 ? 1 : 0,
              transform: p >= 0.96 ? "translateY(0)" : "translateY(10px)",
            }}
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
          </div>

          {/* play state */}
          <div className="mt-7 flex items-center gap-3">
            <div className="relative w-28 h-1 rounded-full overflow-hidden" style={{ background: t.line }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100"
                style={{ width: `${Math.round(p * 100)}%`, background: hue }}
              />
            </div>
            <button
              type="button"
              onClick={play}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-70"
              style={{ color: t.faint, opacity: played ? 1 : 0.35 }}
              aria-label="Replay this scene"
            >
              <Play className="w-3.5 h-3.5" weight="fill" />
              Replay
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="rounded-[24px]"
          style={{ boxShadow: `0 40px 120px -45px ${hue}${light ? "70" : "66"}` }}
        >
          {demo}
        </motion.div>
      </div>
    </section>
  );
}


/**
 * The hero is made of trip ARTIFACTS — things a trip leaves behind:
 * a luggage tag, a polaroid, a receipt, the group-chat sticky note
 * finally stamped YES. They float with the cursor and bob idly,
 * threaded by a dashed flight path with a plane flying it. No app
 * screens up here — those belong to the chapters below.
 */
function HeroTrailer({ t, light }: { t: Theme; light: boolean }) {
  // cursor parallax (plain listeners; artifacts move at different depths)
  const [cur, setCur] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      setCur({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const drift = (fx: number, fy: number): React.CSSProperties => ({
    transform: `translate(${cur.x * fx}px, ${cur.y * fy}px)`,
    transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1)",
  });
  const ink = light ? "#141414" : "#F5F5F7";

  return (
    <section className="relative overflow-hidden px-6 pt-16 sm:pt-24 pb-20">
      <style>{`
        @keyframes vf-bob { from { translate: 0 -7px; } to { translate: 0 7px; } }
        @keyframes vf-bob2 { from { translate: 0 5px; } to { translate: 0 -9px; } }
      `}</style>
      {/* soft hue field */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 left-[18%] w-[42rem] h-[42rem] rounded-full blur-[130px]"
          style={{ background: light ? "rgba(109,90,230,0.16)" : "rgba(139,124,255,0.24)", ...drift(50, 34) }}
        />
        <div
          className="absolute top-10 right-[10%] w-[34rem] h-[34rem] rounded-full blur-[120px]"
          style={{ background: light ? "rgba(224,178,82,0.20)" : "rgba(224,178,82,0.13)", ...drift(-30, -22) }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-10 items-center">
        {/* ── left: the claim ── */}
        <div className="text-center lg:text-start">
          <TicketStamp clock="PAX 04" label="Now boarding" hue={light ? "#6D5AE6" : "#8B7CFF"} t={t} />
          <h1 className="mt-7 text-[42px] sm:text-6xl xl:text-7xl font-semibold tracking-[-0.045em] leading-[1.02]">
            Pack <span style={{ color: light ? "#8F6400" : "#E0B252" }}>sawa</span>
            <span style={{ color: t.faint }}>.</span>
            <br />
            <span style={{ color: t.faint }}>The whole trip,</span>
            <br />
            <span style={{ color: light ? "#6D5AE6" : "#8B7CFF" }}>one home.</span>
          </h1>
          <p className="mt-6 text-lg max-w-md mx-auto lg:mx-0" style={{ color: t.sub }}>
            <span className="font-semibold" style={{ color: light ? "#8F6400" : "#E8CB86" }}>
              sawa · سوا
            </span>{" "}
            means together — the plan, the money, the memories.
          </p>
          <div className="mt-9 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#6D5AE6] text-white hover:bg-[#5B4BD9] px-6 py-3.5 text-base font-bold transition-all hover:-translate-y-0.5"
              style={{ boxShadow: light ? "0 14px 40px -14px rgba(109,90,230,0.55)" : "0 14px 40px -14px rgba(139,124,255,0.45)" }}
            >
              Start a trip
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
            <span className="text-[13px]" style={{ color: t.faint }}>
              Free · English + العربية
            </span>
          </div>
        </div>

        {/* ── right: the artifact constellation ── */}
        <div className="relative h-[440px] sm:h-[500px] select-none" aria-hidden>
          {/* dashed flight path + flying plane (SMIL, zero JS) */}
          <svg viewBox="0 0 480 500" fill="none" className="absolute inset-0 w-full h-full">
            <path
              id="vf-route"
              d="M40 420 C 120 300, 150 160, 265 120 S 440 130, 445 60"
              stroke={light ? "#6D5AE6" : "#8B7CFF"}
              strokeOpacity="0.4"
              strokeWidth="1.6"
              strokeDasharray="7 9"
            />
            {[
              { x: 40, y: 420, c: light ? "#6D5AE6" : "#8B7CFF" },
              { x: 152, y: 224, c: light ? "#0C7A6F" : "#3EC5B7" },
              { x: 300, y: 116, c: light ? "#D06A3A" : "#FF8A5C" },
              { x: 445, y: 60, c: light ? "#8F6400" : "#E0B252" },
            ].map((w, i) => (
              <circle key={i} cx={w.x} cy={w.y} r="5" fill={w.c} opacity="0.9" />
            ))}
            <g>
              <path
                d="M0 -7 L2 -1.5 L8 0 L2 1.5 L0 7 L1 1 L-4 0 L1 -1 Z"
                fill={light ? "#6D5AE6" : "#8B7CFF"}
                transform="scale(1.7)"
              />
              <animateMotion dur="9s" repeatCount="indefinite" rotate="auto">
                <mpath href="#vf-route" />
              </animateMotion>
            </g>
          </svg>

          {/* luggage tag */}
          <div
            className="absolute left-[2%] top-[52%] w-[190px]"
            style={{ ...drift(26, 18), animation: "vf-bob 5.2s ease-in-out infinite alternate" }}
          >
            <div
              className="rounded-2xl border-2 p-4 -rotate-8 shadow-xl"
              style={{
                background: t.card,
                borderColor: light ? "#6D5AE6" : "#8B7CFF",
                boxShadow: `0 24px 60px -24px ${light ? "rgba(109,90,230,0.5)" : "rgba(139,124,255,0.4)"}`,
              }}
            >
              <div className="w-4 h-4 rounded-full border-2 mb-2" style={{ borderColor: light ? "#6D5AE6" : "#8B7CFF" }} />
              <p className="text-2xl font-semibold tracking-[-0.02em]" style={{ color: ink }}>
                PAX·04
              </p>
              <p className="mt-1 text-[12px] font-bold" style={{ color: light ? "#8F6400" : "#E0B252" }}>
                نروح سوا ✈
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: t.faint }}>
                Handle together
              </p>
            </div>
          </div>

          {/* polaroid */}
          <div
            className="absolute right-[4%] top-[2%] w-[200px]"
            style={{ ...drift(-34, -20), animation: "vf-bob2 6.4s ease-in-out infinite alternate" }}
          >
            <div className="rounded-lg p-2.5 pb-3 rotate-6 shadow-xl" style={{ background: light ? "#FFFFFF" : "#ECECEC" }}>
              <div
                className="h-[130px] rounded-sm"
                style={{
                  background:
                    "linear-gradient(180deg, #2A2547 0%, #6D5AE6 38%, #FF8A5C 72%, #E0B252 100%)",
                }}
              />
              <p className="mt-2.5 text-center text-[13px] italic" style={{ color: "#3A3A3A", fontFamily: "cursive" }}>
                Tokyo, day 3 🗼
              </p>
            </div>
          </div>

          {/* receipt */}
          <div
            className="absolute right-[16%] bottom-[4%] w-[170px]"
            style={{ ...drift(22, -14), animation: "vf-bob 7.1s ease-in-out infinite alternate" }}
          >
            <div
              className="p-3.5 -rotate-3 shadow-lg font-mono text-[10px] leading-relaxed"
              style={{
                background: light ? "#FFFDF6" : "#F2EFE6",
                color: "#4A4438",
                clipPath:
                  "polygon(0 0, 100% 0, 100% 92%, 92% 100%, 84% 93%, 74% 100%, 64% 93%, 54% 100%, 44% 93%, 34% 100%, 24% 93%, 14% 100%, 6% 93%, 0 100%)",
              }}
            >
              <p className="font-bold tracking-widest">IZAKAYA ★ TOKYO</p>
              <p className="mt-1.5 flex justify-between"><span>DINNER ×4</span><span>¥12,400</span></p>
              <p className="flex justify-between"><span>SPLIT 4 WAYS</span><span>¥3,100</span></p>
              <p className="mt-1.5 font-bold" style={{ color: "#4E7A34" }}>✓ SETTLED · سوا</p>
            </div>
          </div>

          {/* the sticky note — the group chat's question, finally answered */}
          <div
            className="absolute left-[26%] top-[6%] w-[185px]"
            style={{ ...drift(-18, 26), animation: "vf-bob2 5.8s ease-in-out infinite alternate" }}
          >
            <div
              className="p-4 rotate-3 shadow-lg"
              style={{ background: light ? "#F7E8B5" : "#EAD79A", color: "#4A4020" }}
            >
              <p className="text-[15px] leading-snug" style={{ fontFamily: "cursive" }}>
                so… are we actually doing this?? 😅
              </p>
              <div
                className="mt-2.5 inline-block border-[2.5px] px-2 py-0.5 -rotate-6 text-[16px] font-black tracking-[0.14em]"
                style={{ borderColor: light ? "#6D5AE6" : "#5B4BD9", color: light ? "#6D5AE6" : "#5B4BD9" }}
              >
                YES ✈
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
