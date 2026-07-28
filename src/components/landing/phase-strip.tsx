"use client";

import { motion } from "motion/react";

/**
 * Landing v3 — "One app, four shapes."
 *
 * The single most differentiating thing about Paxawa is the tripPhase
 * engine: the app literally re-arranges itself around where the trip is.
 * This section sells that as a horizontal timeline of four phase cards,
 * each carrying its in-app semantic hue (brand → wayfind → horizon →
 * dune), connected by a hairline that fills as the cards stagger in.
 */

const PHASES: {
  key: string;
  label: string;
  title: string;
  body: string;
  hue: string;
  dim: string;
}[] = [
  {
    key: "planning",
    label: "Planning",
    title: "The cockpit",
    body: "Readiness bar, day chips, open decisions. The home screen is a to-do list that empties itself.",
    hue: "#8B7CFF",
    dim: "rgba(139,124,255,0.14)",
  },
  {
    key: "departure",
    label: "Departure",
    title: "T-minus board",
    body: "Documents pinned, weather pulled in, packing gaps called out. Nothing left to a 2am panic.",
    hue: "#3EC5B7",
    dim: "rgba(62,197,183,0.14)",
  },
  {
    key: "live",
    label: "On the trip",
    title: "Today, only",
    body: "The day's stops up top, spend logged as it happens — and Pocket Day keeps it all working offline.",
    hue: "#FF8A5C",
    dim: "rgba(255,138,92,0.14)",
  },
  {
    key: "recap",
    label: "After",
    title: "The Wrap",
    body: "Photos, awards, one last settle-up — a shareable recap instead of a dead group chat.",
    hue: "#E0B252",
    dim: "rgba(224,178,82,0.14)",
  },
];

export function PhaseStrip() {
  return (
    <section
      id="phases"
      className="relative border-t border-white/[0.06] scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4"
        >
          02 · The idea
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] max-w-2xl"
        >
          One app, four shapes.
          <span className="block mt-2 text-white/40 text-xl sm:text-2xl font-normal tracking-normal">
            Every message up there has the same root cause: the trip moved on,
            the tools didn&apos;t. Paxawa changes shape with it.
          </span>
        </motion.h2>

        {/* Timeline */}
        <div className="relative mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* connecting hairline — desktop only */}
          <div
            aria-hidden
            className="hidden lg:block absolute top-[22px] inset-x-10 h-px bg-white/[0.08]"
          />
          {PHASES.map((p, i) => (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative rounded-2xl border border-white/[0.07] bg-[#161616] p-5 pt-6"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <span
                  className="relative z-10 w-3 h-3 rounded-full shrink-0"
                  style={{ background: p.hue, boxShadow: `0 0 14px ${p.dim}` }}
                />
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: p.hue }}
                >
                  {p.label}
                </span>
              </div>
              <p className="text-lg font-semibold text-white tracking-tight">
                {p.title}
              </p>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">
                {p.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
