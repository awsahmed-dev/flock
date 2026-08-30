"use client";

import { motion } from "motion/react";
import {
  CheckSquareOffset as Vote,
  Wallet,
  FileText,
  Package,
  Heart,
} from "@phosphor-icons/react/dist/ssr";
import { DemoFrame } from "./demo-frame";
import { frame, seg } from "./frame";
import { APP, MiniTicket, MiniHorizon, MiniInspireBar } from "./app-kit";

/**
 * PLAN mockup — a faithful miniature of the real planning cockpit
 * (hero → boarding Ticket → Horizon → the Discover import bar), scrubbed
 * by the station movie: hero → ticket lands → horizon track fills →
 * the TikTok/IG import door slides in.
 */

export function NowDemo({ progress }: { progress?: number }) {
  const track = 4 + Math.round(seg(progress, 0.35, 0.7) * 8); // eases to T−106's spot
  return (
    <DemoFrame toneClass="from-[#8B7CFF]/[0.07] to-transparent">
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: APP.bg, color: APP.fg }}>
        {/* hero — name + dates + countdown badge over the cover */}
        <motion.div
          {...frame(progress, 0.02, { opacity: 0 }, { opacity: 1 })}
          className="relative shrink-0 h-[92px] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B7CFF]/50 via-[#5B4BD9]/40 to-[#3EC5B7]/30" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 15%, rgba(0,0,0,0.88))" }} />
          <span
            className="absolute top-2 start-2.5 rounded-lg px-2 py-0.5 text-[10px] font-bold"
            style={{ background: "rgba(255,138,92,0.16)", color: APP.horizon, border: `1px solid ${APP.horizon}` }}
          >
            In 106 days
          </span>
          <div className="absolute bottom-0 inset-x-0 px-3.5 pb-2">
            <p className="text-[17px] font-bold tracking-[-0.02em] text-white">Tokyo, sawa 🗼</p>
            <p className="text-[10px] text-white/85 mt-0.5">Tokyo · 8 – 15 Nov · 4 going</p>
          </div>
        </motion.div>

        <div className="flex-1 px-3 py-3 flex flex-col gap-2.5 overflow-hidden">
          {/* THE one primary action — a boarding stub in the hue of what it asks */}
          <motion.div {...frame(progress, 0.12, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}>
            <MiniTicket
              hue="horizon"
              kicker="Decide · 3 votes open"
              title="Pick the Shibuya night"
              sub="The crew is split 2–2"
              icon={Vote}
            />
          </motion.div>

          {/* the Horizon — readiness as a runway, marks where they sit in time */}
          <motion.div {...frame(progress, 0.3, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}>
            <MiniHorizon
              title="Tokyo in 106 days"
              nowLabel="T−106"
              progress={progress === undefined ? 12 : track}
              marks={[
                { at: 42, label: "Budget", icon: Wallet, state: "done" },
                { at: 66, label: "Docs", icon: FileText, state: "due" },
                { at: 88, label: "Pack", icon: Package, state: "later" },
              ]}
            />
          </motion.div>

          {/* the Deck — crew hearts note */}
          <motion.div
            {...frame(progress, 0.55, { opacity: 0, x: 12 }, { opacity: 1, x: 0 }, 0.35)}
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: APP.card, border: `1px solid ${APP.border}` }}
          >
            <Heart size={14} weight="fill" style={{ color: APP.horizon }} className="shrink-0" />
            <p className="text-[11px] flex-1 truncate" style={{ color: APP.fg }}>
              Omoide Yokocho · <span style={{ color: APP.muted }}>3 hearts · on the plan</span>
            </p>
          </motion.div>

          {/* the import door — paste a reel, real places land on the shortlist */}
          <motion.div
            {...frame(progress, 0.78, { opacity: 0, y: 12 }, { opacity: 1, y: 0 })}
            className="mt-auto flex flex-col gap-1.5"
          >
            <MiniInspireBar />
            <motion.p
              {...frame(progress, 0.92, { opacity: 0 }, { opacity: 1 })}
              className="text-[10px] px-1"
              style={{ color: APP.muted }}
            >
              <span style={{ color: APP.brand, fontWeight: 700 }}>Layla&apos;s reel</span> → 3 real places on the shortlist
            </motion.p>
          </motion.div>
        </div>
      </div>
    </DemoFrame>
  );
}
