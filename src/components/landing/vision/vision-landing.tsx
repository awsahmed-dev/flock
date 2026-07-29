"use client";

/**
 * VISION CONCEPT — "The page is the trip."
 *
 * The product's thesis is that the app changes shape as the trip moves
 * through four phases. This landing doesn't explain that — it performs
 * it. The visitor scrolls through the trip itself:
 *
 *   T−89 · PLANNING   (brand)    → the cockpit
 *   T−7  · DEPARTURE  (wayfind)  → the T-minus board
 *   DAY 3 · LIVE      (horizon)  → spend + offline
 *   HOME · THE WRAP   (dune)     → the ending, and the name
 *
 * A fixed trip-clock rail tracks progress; every chapter is stamped
 * like a boarding pass; the final CTA IS a boarding pass. Same design
 * tokens as the app — the concept is structural, not cosmetic.
 */

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "motion/react";
import { useState } from "react";
import { ArrowRight, AirplaneTakeoff } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";
import { HeroAurora } from "../aurora";
import { NowDemo } from "../demos/now-demo";
import { VoteDemo } from "../demos/vote-demo";
import { ExpenseDemo } from "../demos/expense-demo";
import { WrapDemo } from "../demos/wrap-demo";

const PHASES = [
  { key: "planning", clock: "T−89", label: "Planning", hue: "#8B7CFF" },
  { key: "departure", clock: "T−7", label: "Departure", hue: "#3EC5B7" },
  { key: "live", clock: "DAY 3", label: "On the trip", hue: "#FF8A5C" },
  { key: "wrap", clock: "HOME", label: "The Wrap", hue: "#E0B252" },
] as const;

/* Boarding-pass chip: dashed seam + notches, stamps every chapter. */
function TicketStamp({
  clock,
  label,
  hue,
}: {
  clock: string;
  label: string;
  hue: string;
}) {
  return (
    <div
      className="inline-flex items-stretch rounded-xl border overflow-hidden text-[11px] font-bold tracking-[0.14em] uppercase"
      style={{ borderColor: `${hue}45`, background: `${hue}0d` }}
    >
      <span className="px-3 py-2 tabular-nums" style={{ color: hue }}>
        {clock}
      </span>
      <span
        className="border-s border-dashed px-3 py-2 text-white/60"
        style={{ borderColor: `${hue}45` }}
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
    title: "The trip is a pile of open questions.",
    accent: "open questions.",
    body: "The cockpit closes them — readiness, day chips, decisions that decide themselves.",
    pain: "“So are we actually doing this?”",
    fix: "Decided",
    demo: <NowDemo />,
  },
  {
    phase: PHASES[1],
    title: "Seven days out, it's a checklist.",
    accent: "a checklist.",
    body: "Documents pinned, weather in, packing gaps named. Polls have already closed.",
    pain: "“Can someone resend the Airbnb link?”",
    fix: "Pinned",
    demo: <VoteDemo />,
  },
  {
    phase: PHASES[2],
    title: "On the ground, it's just today.",
    accent: "just today.",
    body: "Today's stops, receipt-scan splits — and it all works with zero bars.",
    pain: "“Who paid for the taxi?”",
    fix: "Logged",
    demo: <ExpenseDemo />,
  },
  {
    phase: PHASES[3],
    title: "And then — it gets an ending.",
    accent: "an ending.",
    body: "Photos, awards, the final settle-up. One recap the crew actually shares.",
    pain: "“Send me the photos!!”",
    fix: "In the Wrap",
    demo: <WrapDemo />,
  },
];

export function VisionLanding() {
  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: journeyRef,
    offset: ["start 0.6", "end 0.9"],
  });
  const fill = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });
  const fillPct = useTransform(fill, (v) => `${Math.min(100, v * 100)}%`);

  // active phase index for the rail clock
  const [activeIdx, setActiveIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActiveIdx(Math.min(3, Math.floor(v * 4)));
  });
  const active = PHASES[activeIdx];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-[#8B7CFF] selection:text-[#0D0D0D]">
      {/* ── nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0D0D0D]/75 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0 text-white" aria-label="Paxawa home">
            <Logo variant="full" size="sm" />
          </Link>
          <span className="hidden sm:block text-[11px] font-bold tracking-[0.2em] uppercase text-white/30">
            Concept B · the page is the trip
          </span>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#8B7CFF] text-[#0D0D0D] hover:bg-[#9C8FFF] px-4 py-2 text-sm font-bold transition-colors"
          >
            Start a trip
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </header>

      {/* ── hero: the countdown promise ─────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-24 sm:pt-32 pb-16 text-center">
        <HeroAurora />
        <div className="relative max-w-4xl mx-auto">
          <TicketStamp clock="PAX 04" label="Boarding" hue="#8B7CFF" />
          <h1 className="mt-8 text-[44px] sm:text-7xl font-semibold tracking-[-0.045em] leading-[1.02]">
            Every trip lives{" "}
            <span className="text-[#8B7CFF]">four lives</span>.
            <br />
            <span className="text-white/40">One app lives them with you.</span>
          </h1>
          <p className="mt-6 text-lg text-white/55 max-w-xl mx-auto">
            Scroll — the page goes where your trip goes.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#8B7CFF] text-[#0D0D0D] hover:bg-[#9C8FFF] px-5 py-3 text-sm font-bold transition-colors"
            >
              Start a trip
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
            <span className="text-[13px] text-white/40">
              Free · English + العربية
            </span>
          </div>
        </div>
      </section>

      {/* ── the journey ─────────────────────────────────────────────── */}
      <div ref={journeyRef} className="relative">
        {/* trip-clock rail — desktop */}
        <div className="hidden lg:block sticky top-24 h-0 z-30">
          <div className="absolute right-8 xl:right-14 top-8 flex flex-col items-center gap-0">
            <span
              className="mb-3 rounded-lg border px-2.5 py-1.5 text-[12px] font-bold tabular-nums tracking-[0.1em] transition-colors duration-500"
              style={{ color: active.hue, borderColor: `${active.hue}50`, background: `${active.hue}10` }}
            >
              {active.clock}
            </span>
            <div className="relative w-px h-64 bg-white/[0.08] overflow-hidden rounded-full">
              <motion.div
                className="absolute top-0 inset-x-0 w-full"
                style={{ height: fillPct, background: active.hue }}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {PHASES.map((p, i) => (
                <span
                  key={p.key}
                  className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    background: i <= activeIdx ? p.hue : "rgba(255,255,255,0.12)",
                    boxShadow: i === activeIdx ? `0 0 12px ${p.hue}80` : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {CHAPTERS.map((c, i) => {
          const lead = c.title.slice(0, c.title.length - c.accent.length);
          return (
            <section
              key={c.phase.key}
              className="relative border-t border-white/[0.06] overflow-hidden"
            >
              {/* phase-tinted zone */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(70% 60% at ${i % 2 === 0 ? "15%" : "85%"} 50%, ${c.phase.hue}12, transparent 70%)`,
                }}
              />
              <div
                className={`relative max-w-7xl mx-auto px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <motion.div
                    initial={{ opacity: 0, x: i % 2 === 0 ? -14 : 14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5 }}
                  >
                    <TicketStamp clock={c.phase.clock} label={c.phase.label} hue={c.phase.hue} />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, delay: 0.05 }}
                    className="mt-6 text-3xl sm:text-5xl font-semibold tracking-[-0.04em] leading-[1.05] max-w-md"
                  >
                    {lead}
                    <span style={{ color: c.phase.hue }}>{c.accent}</span>
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, delay: 0.12 }}
                    className="mt-5 text-base sm:text-lg text-white/55 leading-relaxed max-w-md"
                  >
                    {c.body}
                  </motion.p>
                  {/* the chapter's doomed message, resolved */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#161616] ps-4 pe-1.5 py-1.5"
                  >
                    <span className="text-[13px] text-white/40 line-through decoration-white/25">
                      {c.pain}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{ color: c.phase.hue, background: `${c.phase.hue}16`, border: `1px solid ${c.phase.hue}35` }}
                    >
                      {c.fix}
                    </span>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7 }}
                >
                  {c.demo}
                </motion.div>
              </div>
            </section>
          );
        })}
      </div>

      {/* ── boarding pass CTA ───────────────────────────────────────── */}
      <section className="relative border-t border-white/[0.06] py-24 sm:py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-8">
            Your boarding pass
          </p>
          <Link href="/auth/signup" className="group block">
            <div className="relative rounded-3xl border border-[#8B7CFF]/40 bg-[#161616] overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_60px_-20px_rgba(139,124,255,0.45)]">
              {/* notches on the seam */}
              <div aria-hidden className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 rounded-full bg-[#0D0D0D] border border-[#8B7CFF]/40" />
              <div aria-hidden className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 rounded-full bg-[#0D0D0D] border border-[#8B7CFF]/40" />

              <div className="p-7 sm:p-9">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[#B3A8FF]">
                    <AirplaneTakeoff className="w-5 h-5" />
                    <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
                      Paxawa · pax + sawa سوا
                    </span>
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/30">
                    travelers, together
                  </span>
                </div>
                <div className="mt-7 grid grid-cols-3 gap-4 text-start">
                  {[
                    { k: "Pax", v: "You + crew" },
                    { k: "Fare", v: "Free" },
                    { k: "Gate", v: "paxawa.com" },
                  ].map((f) => (
                    <div key={f.k}>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/35">
                        {f.k}
                      </p>
                      <p className="mt-1 text-sm sm:text-base font-semibold text-white">
                        {f.v}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* dashed seam + stub */}
              <div className="border-t border-dashed border-[#8B7CFF]/35 px-7 sm:px-9 py-5 flex items-center justify-between gap-4">
                {/* faux barcode — deterministic widths, no hydration drama */}
                <div aria-hidden className="flex items-end gap-[3px] h-8 opacity-70">
                  {[2, 5, 3, 7, 2, 4, 6, 2, 3, 8, 2, 5, 3, 2, 6, 4, 2, 7, 3, 5, 2, 4, 8, 2, 3].map(
                    (w, i) => (
                      <span
                        key={i}
                        className="bg-white/70"
                        style={{ width: w >= 5 ? 3 : 1.5, height: "100%" }}
                      />
                    ),
                  )}
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#8B7CFF] text-[#0D0D0D] px-5 py-2.5 text-sm font-bold transition-colors group-hover:bg-[#9C8FFF]">
                  Board now
                  <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
          <p className="mt-6 text-center text-[13px] text-white/35">
            Two-minute setup · the crew joins with one link
          </p>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs text-white/40">
          <span>© {new Date().getFullYear()} Paxawa — travelers, together</span>
          <Link href="/" className="hover:text-white transition-colors">
            ← Current landing
          </Link>
        </div>
      </footer>
    </div>
  );
}
