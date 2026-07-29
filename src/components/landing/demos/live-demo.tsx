"use client";

import { motion } from "motion/react";
import {
  MapPin,
  CellSignalSlash,
  Camera,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";
import { DemoFrame, DemoHeader } from "./demo-frame";
import { frame } from "./frame";

/**
 * Live-day demo — mirrors the "on the trip" chapter beat for beat:
 * today's stops on one card, a split logged from a receipt, and the
 * offline banner. Horizon orange.
 */

const STOPS = [
  { time: "09:30", name: "Tsukiji breakfast", state: "done" as const },
  { time: "13:00", name: "teamLab Planets", state: "now" as const },
  { time: "19:30", name: "Omoide Yokocho", state: "next" as const },
];

export function LiveDemo({ progress }: { progress?: number }) {
  return (
    <DemoFrame toneClass="from-[#FF8A5C]/[0.08] to-transparent">
      <DemoHeader title="Now · Day 3" subtitle="Tokyo — today, only" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
        {/* offline banner — the Pocket Day promise, front and center */}
        <motion.div
          {...frame(progress, 0.05, { opacity: 0, y: -8 }, { opacity: 1, y: 0 })}
          className="flex items-center gap-2.5 rounded-2xl border border-[#E0B252]/30 bg-[#E0B252]/[0.08] px-3.5 py-2.5"
        >
          <CellSignalSlash className="w-4 h-4 shrink-0" style={{ color: "#E0B252" }} />
          <p className="text-[11px] font-semibold text-[#E8CB86]">
            Zero bars in the metro — today still loads.
          </p>
        </motion.div>

        {/* today's stops */}
        <div className="rounded-2xl bg-[#1A1A1A] border border-white/[0.06] p-2 flex flex-col">
          {STOPS.map((s, i) => (
            <motion.div
              key={s.name}
              {...frame(progress, 0.22 + i * 0.18, { opacity: 0, x: 12 }, { opacity: 1, x: 0 }, 0.15 + i * 0.1)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                s.state === "now" ? "bg-[#FF8A5C]/[0.1] border border-[#FF8A5C]/25" : ""
              }`}
            >
              <span
                className={`text-[11px] font-bold tabular-nums w-10 shrink-0 ${
                  s.state === "done" ? "text-white/30" : "text-white/60"
                }`}
              >
                {s.time}
              </span>
              <MapPin
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: s.state === "now" ? "#FF8A5C" : "rgba(255,255,255,0.3)" }}
              />
              <p
                className={`flex-1 min-w-0 truncate text-[13px] ${
                  s.state === "done"
                    ? "text-white/35 line-through"
                    : s.state === "now"
                      ? "font-semibold text-white"
                      : "text-white/70"
                }`}
              >
                {s.name}
              </p>
              {s.state === "now" && (
                <span className="shrink-0 rounded-full bg-[#FF8A5C]/15 border border-[#FF8A5C]/30 text-[#FFAB88] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  Now
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* receipt just logged */}
        <motion.div
          {...frame(progress, 0.78, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0.5)}
          className="rounded-2xl bg-[#1A1A1A] border border-white/[0.06] px-3.5 py-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#9BC97E]/12 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" style={{ color: "#9BC97E" }} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">
                Lunch · ¥12,400
              </p>
              <p className="text-[11px] text-white/40 truncate">
                Receipt scanned · split 4 ways
              </p>
            </div>
            <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-[#9BC97E]/12 border border-[#9BC97E]/30 text-[#B8DBA1] px-2 py-1 text-[10px] font-bold">
              <CheckCircle weight="fill" className="w-3 h-3" /> ¥3,100 each
            </span>
          </div>
        </motion.div>

        <motion.p
          {...frame(progress, 0.94, { opacity: 0 }, { opacity: 1 })}
          className="mt-auto text-center text-[10px] text-white/30"
        >
          Nobody asked &ldquo;what&apos;s the plan?&rdquo; today. Nobody had to.
        </motion.p>
      </div>
    </DemoFrame>
  );
}
