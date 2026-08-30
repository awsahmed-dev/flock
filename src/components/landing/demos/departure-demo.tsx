"use client";

import { motion } from "motion/react";
import {
  Compass,
  CaretRight,
  Wallet,
  FileText,
  Package,
  Sun,
} from "@phosphor-icons/react/dist/ssr";
import { frame, seg } from "./frame";
import { APP, PhoneShell, MiniTopBar, MiniNav, MiniHorizon } from "./app-kit";

/**
 * PACK station mockup — mirrors the real trip cockpit screenshot: hero
 * with the countdown badge, the quiet action, the Horizon instrument
 * (budget done · docs · pack), the "so you can picture it" Day 1 card,
 * and the weather → Pack line.
 */

export function DepartureDemo({ progress }: { progress?: number }) {
  const track = 10 + Math.round(seg(progress, 0.28, 0.6) * 25);
  return (
    <PhoneShell>
      <MiniTopBar title="Tokyo" />

      {/* hero */}
      <motion.div
        {...frame(progress, 0.02, { opacity: 0 }, { opacity: 1 })}
        className="relative shrink-0 overflow-hidden"
        style={{ height: "21%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/screens/art/cockpit-hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 25%, rgba(0,0,0,0.85))" }} />
        <span
          className="absolute top-1.5 start-2 rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
          style={{ background: "rgba(255,138,92,0.14)", color: APP.horizon, border: `1px solid ${APP.horizon}` }}
        >
          In 23 days
        </span>
        <div className="absolute bottom-0 inset-x-0 px-2.5 pb-1.5">
          <p className="text-[16px] font-bold text-white leading-none">Tokyo</p>
          <p className="text-[8px] text-white/85 mt-0.5">Tokyo, Japan · 20 Sep – 26 Sep 2026</p>
        </div>
      </motion.div>

      <div className="flex-1 min-h-0 px-2 pt-2 flex flex-col gap-1.5 overflow-hidden">
        {/* the quiet action */}
        <motion.div
          {...frame(progress, 0.12, { opacity: 0, y: 8 }, { opacity: 1, y: 0 })}
          className="flex items-center gap-2 rounded-xl border px-2.5 py-2"
          style={{ background: APP.card, borderColor: APP.border }}
        >
          <Compass size={14} style={{ color: APP.brand }} className="shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold truncate">Nothing else due · 23 days out</span>
            <span className="block text-[9px] font-semibold truncate" style={{ color: APP.brand }}>Go heart something in Discover</span>
          </span>
          <CaretRight size={11} style={{ color: APP.muted }} className="shrink-0" />
        </motion.div>

        {/* the Horizon */}
        <motion.div {...frame(progress, 0.24, { opacity: 0, y: 8 }, { opacity: 1, y: 0 })}>
          <MiniHorizon
            title="Horizon · 23 days to Tokyo"
            nowLabel="T−23"
            progress={progress === undefined ? 35 : track}
            marks={[
              { at: 44, label: "budget", icon: Wallet, state: "done" },
              { at: 60, label: "docs", icon: FileText, state: "later" },
              { at: 76, label: "pack", icon: Package, state: "later" },
            ]}
          />
        </motion.div>

        {/* "so you can picture it" — Day 1 card */}
        <motion.div
          {...frame(progress, 0.48, { opacity: 0, y: 12 }, { opacity: 1, y: 0 })}
          className="relative flex-1 min-h-0 rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${APP.border}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/screens/art/day1-senso.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 30%, rgba(0,0,0,0.85))" }} />
          <span className="absolute top-1.5 start-1.5 rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white inline-flex items-center gap-1" style={{ background: "rgba(0,0,0,0.5)" }}>
            📅 So you can picture it
          </span>
          <div className="absolute bottom-0 inset-x-0 px-2.5 pb-2 flex items-end gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[7px] font-black tracking-wide uppercase" style={{ color: "#C9BEFF" }}>Your day 1</p>
              <p className="text-[12px] font-bold text-white truncate">Day 1 · Senso-ji Temple</p>
              <p className="text-[8px] text-white/75">First at 09:30 · 4 stops</p>
            </div>
            <span className="shrink-0 h-6 px-2.5 rounded-full text-[9px] font-bold flex items-center" style={{ background: APP.brand, color: "#fff" }}>
              Open
            </span>
          </div>
        </motion.div>

        {/* weather → the packing nudge */}
        <motion.div
          {...frame(progress, 0.72, { opacity: 0, x: 10 }, { opacity: 1, x: 0 })}
          className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5"
          style={{ background: APP.card, borderColor: APP.border }}
        >
          <span className="rounded-full flex items-center justify-center shrink-0" style={{ width: 20, height: 20, background: "rgba(62,197,183,0.15)" }}>
            <Sun size={11} weight="fill" style={{ color: APP.wayfind }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold truncate">Tokyo · 32° · drizzle</span>
            <span className="block text-[8px] truncate" style={{ color: APP.muted }}>32° · drizzle · sunset 18:14</span>
          </span>
          <span className="text-[9px] font-bold inline-flex items-center gap-0.5 shrink-0" style={{ color: APP.wayfind }}>
            Pack <CaretRight size={9} />
          </span>
        </motion.div>
      </div>

      <MiniNav active="now" />
    </PhoneShell>
  );
}
