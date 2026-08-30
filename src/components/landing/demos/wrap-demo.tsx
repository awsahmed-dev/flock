"use client";

import { motion } from "motion/react";
import {
  ShareNetwork,
  CaretRight,
  Airplane,
  MapPin,
  SunHorizon,
  House,
} from "@phosphor-icons/react/dist/ssr";
import { frame, seg } from "./frame";
import { APP, PhoneShell, MiniTopBar, MiniNav } from "./app-kit";

/**
 * WRAP station mockup — mirrors the real recap screenshot: big hero with
 * "Lisbon, wrapped.", the all-square share row, and the whole-trip
 * Horizon (plane → day pins → last light → home).
 */

const DAYS = ["day 1", "2", "3", "4", "5", "6", "7", "last"] as const;

export function WrapDemo({ progress }: { progress?: number }) {
  const fill = Math.round(seg(progress, 0.4, 0.85) * 96);
  return (
    <PhoneShell>
      <MiniTopBar title="Lisbon" />

      {/* wrapped hero */}
      <motion.div
        {...frame(progress, 0.03, { opacity: 0 }, { opacity: 1 })}
        className="relative flex-1 min-h-0 overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/screens/art/wrap-hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 35%, rgba(0,0,0,0.92))" }} />
        <div className="absolute bottom-0 inset-x-0 px-3 pb-2">
          <motion.p
            {...frame(progress, 0.14, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
            className="text-[22px] font-extrabold tracking-[-0.02em] text-white leading-none"
          >
            Lisbon, wrapped.
          </motion.p>
          <motion.p {...frame(progress, 0.24, { opacity: 0 }, { opacity: 1 })} className="text-[9px] text-white/70 mt-1">
            14 Aug – 21 Aug · 8 days
          </motion.p>
        </div>
      </motion.div>

      <div className="shrink-0 px-2 pt-1.5 flex flex-col gap-1.5">
        {/* all square · share the wrap */}
        <motion.div
          {...frame(progress, 0.32, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
          className="flex items-center gap-2 rounded-xl border px-2.5 py-2"
          style={{ background: APP.card, borderColor: APP.border }}
        >
          <ShareNetwork size={13} style={{ color: APP.brand }} className="shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold truncate">All square — nobody owes anyone</span>
            <span className="block text-[9px] font-semibold" style={{ color: APP.brand }}>Share the Wrap</span>
          </span>
          <CaretRight size={11} style={{ color: APP.muted }} className="shrink-0" />
        </motion.div>

        {/* whole-trip horizon */}
        <motion.div
          {...frame(progress, 0.42, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
          className="rounded-2xl border px-2.5 pt-2 pb-1.5"
          style={{ background: APP.card, borderColor: APP.border }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[8px] font-black tracking-[0.14em] uppercase truncate" style={{ color: APP.muted }}>
              Horizon · the whole trip · 8 days
            </p>
            <span className="text-[8px] font-bold inline-flex items-center gap-1 shrink-0" style={{ color: APP.horizon }}>
              <span className="w-1 h-1 rounded-full" style={{ background: APP.horizon }} /> home
            </span>
          </div>
          <div className="relative pe-8" dir="ltr">
            <div className="flex justify-between mb-1">
              {DAYS.map((d, i) => (
                <motion.span
                  key={d}
                  {...frame(progress, 0.48 + i * 0.045, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1 })}
                  className="rounded-full flex items-center justify-center border"
                  style={{ width: 20, height: 20, background: "rgba(155,201,126,0.16)", borderColor: `${APP.moss}66` }}
                >
                  {i === 0 ? (
                    <Airplane size={10} style={{ color: APP.moss }} />
                  ) : i === DAYS.length - 1 ? (
                    <SunHorizon size={10} style={{ color: APP.moss }} />
                  ) : (
                    <MapPin size={10} style={{ color: APP.moss }} />
                  )}
                </motion.span>
              ))}
            </div>
            <div className="relative h-1 rounded-full" style={{ background: "rgba(245,245,247,0.08)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-200"
                style={{ width: `${progress === undefined ? 96 : fill}%`, background: `linear-gradient(90deg, ${APP.moss}, ${APP.dune})`, boxShadow: `0 0 8px ${APP.moss}66` }}
              />
              <div
                className="absolute -top-1 -translate-x-1/2 rounded-full transition-[left] duration-200"
                style={{ left: `${progress === undefined ? 96 : fill}%`, width: 12, height: 12, background: APP.horizon, boxShadow: `0 0 0 3px ${APP.horizon}38, 0 0 10px ${APP.horizon}99` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              {DAYS.map((d) => (
                <span key={d} className="text-[6px] font-semibold text-center" style={{ color: APP.moss, width: 20 }}>{d}</span>
              ))}
            </div>
            <span
              className="absolute right-0 top-1 rounded-full border flex items-center justify-center"
              style={{ width: 22, height: 22, borderColor: APP.border, background: "rgba(245,245,247,0.06)" }}
            >
              <House size={10} weight="fill" style={{ color: "rgba(245,245,247,0.8)" }} />
            </span>
          </div>
        </motion.div>
      </div>

      <MiniNav active="now" />
    </PhoneShell>
  );
}
