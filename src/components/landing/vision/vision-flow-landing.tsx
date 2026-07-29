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

      {/* compact hero */}
      <section className="relative overflow-hidden px-6 pt-20 sm:pt-28 pb-14 text-center">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-40 left-1/4 w-[40rem] h-[40rem] rounded-full blur-[130px]"
            style={{ background: light ? "rgba(109,90,230,0.14)" : "rgba(139,124,255,0.22)" }}
          />
          <div
            className="absolute top-10 right-1/4 w-[32rem] h-[32rem] rounded-full blur-[120px]"
            style={{ background: light ? "rgba(224,178,82,0.16)" : "rgba(224,178,82,0.12)" }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <TicketStamp clock="PAX 04" label="Now boarding" hue={light ? "#6D5AE6" : "#8B7CFF"} t={t} />
          <h1 className="mt-8 text-[42px] sm:text-6xl font-semibold tracking-[-0.045em] leading-[1.02]">
            Pack <span style={{ color: light ? "#8F6400" : "#E0B252" }}>sawa</span>
            <span style={{ color: t.faint }}>.</span>{" "}
            <span style={{ color: t.faint }}>Watch the trip</span>{" "}
            <span style={{ color: light ? "#6D5AE6" : "#8B7CFF" }}>play out.</span>
          </h1>
          <p className="mt-5 text-lg max-w-xl mx-auto" style={{ color: t.sub }}>
            Four phases, four little movies. They play as you pass.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
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
        </div>
      </section>

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
