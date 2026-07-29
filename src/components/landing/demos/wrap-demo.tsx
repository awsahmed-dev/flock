"use client";

import { motion } from "motion/react";
import { ShareNetwork as Share2 } from "@phosphor-icons/react/dist/ssr";
import { DemoFrame } from "./demo-frame";
import { frame } from "./frame";

/**
 * Wrap demo — the post-trip recap card. Dune-gold accents; big serif-free
 * "Tokyo, wrapped." headline, stat counters, award chips, share CTA.
 */

const STATS = [
  { label: "Days", value: "8" },
  { label: "Stops", value: "21" },
  { label: "Spent", value: "$2,140" },
  { label: "Crew", value: "4" },
];

const AWARDS = [
  { emoji: "🏆", label: "MVP planner — Priya" },
  { emoji: "📸", label: "Most photographed — Shibuya Sky" },
  { emoji: "🍜", label: "Best meal — Omoide Yokocho" },
];

export function WrapDemo({ progress }: { progress?: number }) {
  return (
    <DemoFrame toneClass="from-[#E0B252]/[0.09] to-transparent">
      <div className="flex-1 px-5 py-7 flex flex-col gap-5 overflow-hidden">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#E0B252] mb-2">
            The Wrap
          </p>
          <motion.h4
            {...frame(progress, 0.05, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
            className="text-3xl font-semibold tracking-[-0.03em] text-white leading-none"
          >
            Tokyo,
            <br />
            wrapped.
          </motion.h4>
          <p className="mt-2 text-[12px] text-white/40">Nov 8 – 15 · 2026</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              {...frame(progress, 0.22 + i * 0.09, { opacity: 0, y: 10 }, { opacity: 1, y: 0 }, 0.15 + i * 0.08)}
              className="rounded-xl bg-[#1A1A1A] border border-white/[0.06] px-2 py-2.5 text-center"
            >
              <p className="text-[15px] font-bold text-white tabular-nums leading-none">
                {s.value}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-wider text-white/35 font-bold">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          {AWARDS.map((a, i) => (
            <motion.div
              key={a.label}
              {...frame(progress, 0.55 + i * 0.12, { opacity: 0, x: 10 }, { opacity: 1, x: 0 }, 0.35 + i * 0.1)}
              className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <span className="text-base leading-none">{a.emoji}</span>
              <p className="text-[12px] text-white/70 font-medium truncate">
                {a.label}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          {...frame(progress, 0.9, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
          className="mt-auto flex flex-col gap-2"
        >
          <div className="flex items-center justify-center gap-2 rounded-full bg-[#E0B252] text-[#161000] px-4 py-3 text-[13px] font-bold">
            <Share2 className="w-4 h-4" /> Share the Wrap
          </div>
          <p className="text-center text-[10px] text-white/30">
            All square 🤝 — nobody owes anybody.
          </p>
        </motion.div>
      </div>
    </DemoFrame>
  );
}
