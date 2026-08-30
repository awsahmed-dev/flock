"use client";

import { motion } from "motion/react";
import { DemoFrame, DemoHeader } from "./demo-frame";
import { frame, seg } from "./frame";

/**
 * The BOARDING preloader phone — a byte-for-byte copy of the original
 * NowDemo the production loading screen ships (readiness bar boots with
 * the load counter). Aws: the stations move to real screenshots, but the
 * loading screen stays exactly as it is live — don't touch it.
 */

const DAYS = [
  { d: "Sun 8", n: 3, tone: "#FF8A5C" },
  { d: "Mon 9", n: 2, tone: "#3EC5B7" },
  { d: "Tue 10", n: 2, tone: "#E0B252" },
  { d: "Wed 11", n: 1, tone: "#8B7CFF" },
  { d: "Thu 12", n: 0, tone: "#666" },
];

export function BoardingDemo({ progress }: { progress?: number }) {
  const readiness = Math.round(seg(progress, 0.12, 0.5) * 57);
  return (
    <DemoFrame toneClass="from-[#8B7CFF]/[0.07] to-transparent">
      <DemoHeader title="Now · Planning" subtitle="Tokyo 🗼 (yes we're doing this)" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
        {/* Countdown + crew */}
        <motion.div
          {...frame(progress, 0.02, { opacity: 0, y: 8 }, { opacity: 1, y: 0 })}
          className="flex items-center justify-between gap-2"
        >
          <span className="rounded-full bg-[#8B7CFF]/15 text-[#B3A8FF] border border-[#8B7CFF]/25 px-2.5 py-1 text-[11px] font-bold">
            In 106 days
          </span>
          <span className="text-[11px] text-white/40">4 going</span>
        </motion.div>

        {/* Readiness — the bar fill scrubs with scroll */}
        <motion.div
          {...frame(progress, 0.1, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
          className="rounded-2xl bg-[#1A1A1A] border border-white/[0.06] p-3.5"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-white">Trip readiness</p>
            <p className="text-[12px] font-bold text-[#9BC97E] tabular-nums">
              {progress === undefined ? 57 : readiness}%
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            {progress === undefined ? (
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "57%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                className="h-full me-auto rounded-full bg-[#9BC97E]"
              />
            ) : (
              <div
                className="h-full me-auto rounded-full bg-[#9BC97E] transition-[width] duration-150"
                style={{ width: `${readiness}%` }}
              />
            )}
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            Dates ✓ · Crew ✓ · Stops ✓ · Budget ✓ · Packing 5%
          </p>
        </motion.div>

        {/* Day chips — light up one by one */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/35 mb-2">
            Plan days
          </p>
          <div className="flex gap-1.5 overflow-hidden">
            {DAYS.map((day, i) => (
              <motion.div
                key={day.d}
                {...frame(progress, 0.45 + i * 0.07, { opacity: 0, y: 8 }, { opacity: 1, y: 0 })}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 ${
                  day.n === 0
                    ? "border-white/[0.06] text-white/30"
                    : "border-white/[0.1] text-white/80 bg-white/[0.03]"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: day.tone }} />
                {day.d}
                {day.n > 0 && <span className="text-white/35">· {day.n}</span>}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Ticker */}
        <motion.div
          {...frame(progress, 0.8, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
          className="rounded-2xl bg-[#1A1A1A] border border-white/[0.06] px-3.5 py-3"
        >
          <p className="text-[11px] text-white/50 truncate">
            <span className="text-white/80 font-semibold">Priya</span> hearted
            Omoide Yokocho · <span className="text-white/80 font-semibold">Tariq</span>{" "}
            uploaded the JR Pass →
          </p>
        </motion.div>

        {/* Pocket Day */}
        <motion.div
          {...frame(progress, 0.92, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
          className="mt-auto flex items-center gap-2 rounded-2xl border border-[#E0B252]/25 bg-[#E0B252]/[0.07] px-3.5 py-3"
        >
          <span className="w-2 h-2 rounded-full bg-[#E0B252]" />
          <p className="text-[11px] text-[#E8CB86] font-semibold">
            Pocket Day — today&apos;s plan works with zero bars
          </p>
        </motion.div>
      </div>
    </DemoFrame>
  );
}
