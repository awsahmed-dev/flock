"use client";

import { motion } from "motion/react";
import {
  NavigationArrow,
  ForkKnife,
  Camera,
  Moon,
  Sun,
  CellSignalSlash,
  CheckCircle,
  MapPin,
} from "@phosphor-icons/react/dist/ssr";
import { DemoFrame } from "./demo-frame";
import { frame } from "./frame";
import { APP, MiniTicket, MiniHorizon } from "./app-kit";

/**
 * SPLIT mockup — the real LIVE cockpit in miniature: wayfind "Up next"
 * Ticket, today's Horizon on a clock axis, the weather line, the
 * receipt-scan split, and the Pocket Day promise.
 */

export function LiveDemo({ progress }: { progress?: number }) {
  return (
    <DemoFrame toneClass="from-[#FF8A5C]/[0.08] to-transparent">
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: APP.bg, color: APP.fg }}>
        <div className="shrink-0 px-3.5 pt-4 pb-2.5" style={{ borderBottom: `1px solid ${APP.border}` }}>
          <p className="text-[9px] tracking-[0.16em] font-black uppercase" style={{ color: APP.muted }}>
            Now · Live · Day 3
          </p>
          <p className="text-[14px] font-bold mt-0.5">Tokyo — today, only</p>
        </div>

        <div className="flex-1 px-3 py-3 flex flex-col gap-2.5 overflow-hidden">
          <motion.div {...frame(progress, 0.06, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}>
            <MiniTicket
              hue="wayfind"
              kicker="Up next · 13:00 · in 25 min"
              title="teamLab Planets"
              sub="Toyosu · 12 min by metro"
              icon={NavigationArrow}
            />
          </motion.div>

          <motion.div {...frame(progress, 0.26, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}>
            <MiniHorizon
              title="Today · Day 3"
              nowLabel="12:35"
              progress={44}
              endIcon={Moon}
              marks={[
                { at: 18, label: "Tsukiji", icon: ForkKnife, state: "done" },
                { at: 52, label: "teamLab", icon: MapPin, state: "due" },
                { at: 84, label: "Omoide", icon: ForkKnife, state: "later" },
              ]}
            />
          </motion.div>

          <motion.div
            {...frame(progress, 0.48, { opacity: 0, x: 12 }, { opacity: 1, x: 0 }, 0.3)}
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: APP.card, border: `1px solid ${APP.border}` }}
          >
            <Sun size={14} weight="fill" style={{ color: APP.wayfind }} className="shrink-0" />
            <p className="text-[11px] truncate" style={{ color: APP.fg }}>
              24° clear · sunset 17:58
            </p>
          </motion.div>

          {/* receipt just scanned — Point-and-Split */}
          <motion.div
            {...frame(progress, 0.64, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0.45)}
            className="rounded-xl px-3 py-2.5"
            style={{ background: APP.card, border: `1px solid ${APP.border}` }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(155,201,126,0.18)" }}
              >
                <Camera size={14} style={{ color: APP.moss }} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate">Lunch · ¥12,400</p>
                <p className="text-[10px] truncate" style={{ color: APP.muted }}>
                  Receipt scanned · split 4 ways
                </p>
              </div>
              <span
                className="inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-1 text-[10px] font-bold"
                style={{ background: "rgba(155,201,126,0.18)", color: APP.moss, border: `1px solid ${APP.moss}55` }}
              >
                <CheckCircle weight="fill" size={11} /> ¥3,100 each
              </span>
            </div>
          </motion.div>

          {/* Pocket Day — the offline promise */}
          <motion.div
            {...frame(progress, 0.86, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
            className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "rgba(224,178,82,0.10)", border: "1px solid rgba(224,178,82,0.35)" }}
          >
            <CellSignalSlash size={13} className="shrink-0" style={{ color: APP.dune }} />
            <p className="text-[10px] font-semibold" style={{ color: APP.dune }}>
              Zero bars in the metro — today still loads.
            </p>
          </motion.div>
        </div>
      </div>
    </DemoFrame>
  );
}
