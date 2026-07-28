"use client";

import { motion } from "motion/react";
import { Heart, Plus, MapPin } from "@phosphor-icons/react/dist/ssr";
import { DemoFrame, DemoHeader } from "./demo-frame";

/**
 * Discover demo — taste chips + two place cards with the reason chips
 * the Taste Engine actually generates ("Priya's kind of place",
 * "Hidden gem — your thing"). Wayfind teal accents, matching the app.
 */

const CHIPS = ["Crew picks", "Food", "Hidden gems", "Night out", "Saved"];

const PLACES = [
  {
    name: "Omoide Yokocho",
    meta: "Izakaya alley · Shinjuku",
    reason: "Priya's kind of place",
    grad: "from-[#3EC5B7]/30 via-[#1A1A1A] to-[#1A1A1A]",
    hearts: 3,
  },
  {
    name: "teamLab Planets",
    meta: "Art museum · Toyosu",
    reason: "Hidden gem — your thing",
    grad: "from-[#8B7CFF]/25 via-[#1A1A1A] to-[#1A1A1A]",
    hearts: 2,
  },
];

export function DiscoverDemo() {
  return (
    <DemoFrame toneClass="from-[#3EC5B7]/[0.07] to-transparent">
      <DemoHeader title="Discover · Tokyo" subtitle="Tuned to the whole crew's taste" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
        {/* Taste chips */}
        <div className="flex gap-1.5 overflow-hidden">
          {CHIPS.map((c, i) => (
            <motion.span
              key={c}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold border ${
                i === 0
                  ? "bg-[#3EC5B7]/15 text-[#7BDCD1] border-[#3EC5B7]/30"
                  : "border-white/[0.09] text-white/55"
              }`}
            >
              {c}
            </motion.span>
          ))}
        </div>

        {PLACES.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.12 }}
            className="rounded-2xl border border-white/[0.07] bg-[#161616] overflow-hidden"
          >
            {/* photo stand-in */}
            <div className={`relative h-20 bg-gradient-to-br ${p.grad}`}>
              <span className="absolute top-2.5 start-2.5 rounded-full bg-black/50 backdrop-blur px-2 py-1 text-[10px] font-bold text-white/85 flex items-center gap-1">
                <Heart className="w-3 h-3 text-[#FF8A5C]" weight="fill" />
                {p.hearts}
              </span>
              <span className="absolute bottom-2.5 start-2.5 rounded-full bg-[#3EC5B7]/20 border border-[#3EC5B7]/30 text-[#7BDCD1] px-2 py-0.5 text-[10px] font-bold">
                {p.reason}
              </span>
            </div>
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">
                  {p.name}
                </p>
                <p className="text-[11px] text-white/40 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {p.meta}
                </p>
              </div>
              <button
                type="button"
                tabIndex={-1}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#3EC5B7]/15 border border-[#3EC5B7]/30 text-[#7BDCD1] px-2.5 py-1.5 text-[11px] font-bold"
              >
                <Plus className="w-3 h-3" /> Plan
              </button>
            </div>
          </motion.div>
        ))}

        <p className="mt-auto text-[10px] text-white/30 text-center">
          Powered by Google Places · ranked by your crew&apos;s taste
        </p>
      </div>
    </DemoFrame>
  );
}
