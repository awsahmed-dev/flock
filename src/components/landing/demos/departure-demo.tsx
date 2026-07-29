"use client";

import { motion } from "motion/react";
import {
  AirplaneTakeoff,
  FilePdf,
  CloudRain,
  Package,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";
import { DemoFrame, DemoHeader } from "./demo-frame";

/**
 * Departure-board demo — mirrors the Departure chapter beat for beat:
 * docs pinned, weather pulled in, packing gaps named. Wayfind teal.
 */

const ROWS = [
  {
    icon: AirplaneTakeoff,
    title: "Flight · NRT 09:40",
    meta: "Terminal 2 · seats 14A–D",
    ok: true,
  },
  {
    icon: FilePdf,
    title: "Visa + hotel confirmation",
    meta: "Pinned to day 1",
    ok: true,
  },
  {
    icon: CloudRain,
    title: "Tokyo · 18° and rainy Tuesday",
    meta: "Pack a shell jacket",
    ok: true,
  },
  {
    icon: Package,
    title: "Packing · 2 items left",
    meta: "Power adapter · meds",
    ok: false,
  },
];

export function DepartureDemo() {
  return (
    <DemoFrame toneClass="from-[#3EC5B7]/[0.08] to-transparent">
      <DemoHeader title="Departure · T−7" subtitle="Nothing left to a 2am panic" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-2.5 overflow-hidden">
        {ROWS.map((r, i) => {
          const Icon = r.icon;
          return (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, x: 14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
                r.ok
                  ? "border-white/[0.06] bg-[#1A1A1A]"
                  : "border-[#E0B252]/30 bg-[#E0B252]/[0.06]"
              }`}
            >
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  r.ok ? "bg-[#3EC5B7]/12" : "bg-[#E0B252]/15"
                }`}
              >
                <Icon
                  className="w-4.5 h-4.5"
                  style={{ color: r.ok ? "#3EC5B7" : "#E0B252", width: 18, height: 18 }}
                />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">
                  {r.title}
                </p>
                <p className="text-[11px] text-white/40 truncate">{r.meta}</p>
              </div>
              {r.ok ? (
                <CheckCircle
                  weight="fill"
                  className="w-5 h-5 shrink-0"
                  style={{ color: "#3EC5B7" }}
                />
              ) : (
                <span className="shrink-0 rounded-full bg-[#E0B252]/15 border border-[#E0B252]/30 text-[#E8CB86] px-2 py-0.5 text-[10px] font-bold">
                  2 left
                </span>
              )}
            </motion.div>
          );
        })}

        {/* crew readiness */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.55 }}
          className="mt-auto rounded-2xl bg-[#1A1A1A] border border-white/[0.06] px-3.5 py-3"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-white">Crew ready</p>
            <p className="text-[12px] font-bold text-[#3EC5B7] tabular-nums">3 / 4</p>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "75%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.65 }}
              className="h-full me-auto rounded-full bg-[#3EC5B7]"
            />
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            Tariq 🦖 still hasn&apos;t packed. Classic Tariq.
          </p>
        </motion.div>
      </div>
    </DemoFrame>
  );
}
