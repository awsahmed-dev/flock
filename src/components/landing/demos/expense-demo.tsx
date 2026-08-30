"use client";

import { motion } from "motion/react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Train,
  ForkKnife,
  Bed,
  CaretRight,
  Faders,
} from "@phosphor-icons/react/dist/ssr";
import { frame, seg } from "./frame";
import { APP, PhoneShell, MiniTopBar, MiniNav } from "./app-kit";

/**
 * SPLIT station mockup — mirrors the real Money screenshot: the purple
 * spent card (total, you-paid / you-owe pills, budget bar), Personal cap
 * row, the all-square Balances card, and the Activity list with payer
 * avatars.
 */

const ROWS = [
  { icon: Train, tone: APP.horizon, title: "JR passes", meta: "Aug 30 · You", amount: "USD 118", who: "MA", whoBg: "#0FA47A" },
  { icon: ForkKnife, tone: APP.moss, title: "Nishiki street food", meta: "Aug 30 · Rania", amount: "USD 32", who: "RA", whoBg: "#E8A33D" },
  { icon: Bed, tone: APP.wayfind, title: "Ryokan · 2 nights", meta: "Aug 29 · You", amount: "USD 380", who: "MA", whoBg: "#0FA47A" },
] as const;

export function ExpenseDemo({ progress }: { progress?: number }) {
  const bar = Math.round(seg(progress, 0.1, 0.45) * 26);
  return (
    <PhoneShell>
      <MiniTopBar title="Kyoto" />

      <div className="flex-1 min-h-0 px-2 pt-1 flex flex-col gap-1.5 overflow-hidden">
        {/* the spent card */}
        <motion.div
          {...frame(progress, 0.04, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
          className="shrink-0 rounded-2xl px-3 py-2.5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7B6CF0, #5B4BD9)" }}
        >
          <span aria-hidden className="absolute -top-6 -right-4 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          <p className="text-[7px] font-black tracking-[0.14em] uppercase text-white/80">Trip total spent</p>
          <p className="text-[20px] font-extrabold text-white leading-tight tabular-nums">USD 626</p>
          <div className="mt-1.5 flex gap-1.5">
            <span className="flex-1 rounded-lg px-2 py-1" style={{ background: "rgba(255,255,255,0.14)" }}>
              <span className="text-[6px] font-black tracking-wide uppercase text-white/80 inline-flex items-center gap-0.5"><ArrowUpRight size={7} /> You paid</span>
              <span className="block text-[11px] font-bold text-white tabular-nums">USD 498</span>
            </span>
            <span className="flex-1 rounded-lg px-2 py-1" style={{ background: "rgba(255,255,255,0.14)" }}>
              <span className="text-[6px] font-black tracking-wide uppercase text-white/80 inline-flex items-center gap-0.5"><ArrowDownRight size={7} /> You owe</span>
              <span className="block text-[11px] font-bold text-white tabular-nums">USD 0</span>
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[6px] font-black tracking-[0.14em] uppercase text-white/80">Trip budget</p>
            <p className="text-[8px] font-bold text-white tabular-nums">USD 626 <span className="text-white/60">/ 2,400</span></p>
          </div>
          <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.22)" }}>
            <div className="h-full rounded-full bg-white transition-[width] duration-150" style={{ width: `${progress === undefined ? 26 : bar}%` }} />
          </div>
          <p className="mt-0.5 text-[7px] text-white/70">{progress === undefined ? 26 : bar}% used</p>
        </motion.div>

        {/* personal cap */}
        <motion.div
          {...frame(progress, 0.3, { opacity: 0, y: 8 }, { opacity: 1, y: 0 })}
          className="shrink-0 flex items-center gap-2 rounded-xl border px-2.5 py-1.5"
          style={{ background: APP.card, borderColor: APP.border }}
        >
          <Faders size={12} style={{ color: APP.brand }} className="shrink-0" />
          <span className="flex-1 text-[10px] font-semibold">Personal cap</span>
          <span className="text-[9px]" style={{ color: APP.muted }}>Set a personal cap</span>
          <CaretRight size={10} style={{ color: APP.muted }} />
        </motion.div>

        {/* balances */}
        <motion.div
          {...frame(progress, 0.42, { opacity: 0, y: 8 }, { opacity: 1, y: 0 })}
          className="shrink-0 rounded-xl border px-2.5 py-2"
          style={{ background: APP.card, borderColor: APP.border }}
        >
          <p className="text-[11px] font-bold">Balances</p>
          <p className="mt-0.5 text-[9px]" style={{ color: APP.muted }}>All square 🤝 — nobody owes anybody.</p>
        </motion.div>

        {/* activity */}
        <motion.div
          {...frame(progress, 0.54, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
          className="flex-1 min-h-0 rounded-xl border px-2.5 py-2 overflow-hidden"
          style={{ background: APP.card, borderColor: APP.border }}
        >
          <div className="flex items-center justify-between">
            <span>
              <span className="text-[11px] font-bold">Activity · 4</span>
              <span className="block text-[8px]" style={{ color: APP.muted }}>Most recent expenses</span>
            </span>
            <span className="text-[9px] font-bold inline-flex items-center gap-0.5" style={{ color: APP.brand }}>
              View all <CaretRight size={9} />
            </span>
          </div>
          <div className="mt-1.5 flex gap-1">
            <span className="h-5 px-2 rounded-full flex items-center text-[8px] font-bold" style={{ background: "rgba(224,178,82,0.16)", color: APP.dune, border: `1px solid ${APP.dune}55` }}>All</span>
            <span className="h-5 px-2 rounded-full flex items-center text-[8px] font-bold" style={{ background: "rgba(245,245,247,0.08)", color: APP.muted }}>Yours</span>
          </div>
          {ROWS.map((r, i) => {
            const I = r.icon;
            return (
              <motion.div
                key={r.title}
                {...frame(progress, 0.64 + i * 0.1, { opacity: 0, x: 10 }, { opacity: 1, x: 0 })}
                className="flex items-center gap-2 py-1.5"
                style={{ borderTop: i > 0 ? `1px solid ${APP.border}` : undefined, marginTop: i === 0 ? 4 : 0 }}
              >
                <span className="rounded-full flex items-center justify-center shrink-0" style={{ width: 22, height: 22, background: `${r.tone}22` }}>
                  <I size={11} style={{ color: r.tone }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] font-semibold truncate">{r.title}</span>
                  <span className="block text-[8px] truncate" style={{ color: APP.muted }}>{r.meta}</span>
                </span>
                <span className="text-[10px] font-bold tabular-nums shrink-0">{r.amount}</span>
                <span className="rounded-full flex items-center justify-center text-[6px] font-bold shrink-0" style={{ width: 15, height: 15, background: r.whoBg, color: "#fff" }}>{r.who}</span>
                <CaretRight size={9} style={{ color: APP.muted }} className="shrink-0" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <MiniNav active="money" />
    </PhoneShell>
  );
}
