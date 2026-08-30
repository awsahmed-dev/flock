"use client";

import { motion } from "motion/react";
import {
  Heart,
  BookmarkSimple,
  Plus,
  Star,
  MapTrifold,
  TiktokLogo,
  InstagramLogo,
  MapPin,
} from "@phosphor-icons/react/dist/ssr";
import { frame } from "./frame";
import { APP, PhoneShell, MiniTopBar, MiniNav } from "./app-kit";

/**
 * PLAN station mockup — mirrors the real Discover feed screenshot
 * element-for-element: top bar, mode tabs, the import door, the
 * full-bleed place card with its side action rail and meta chips,
 * the next card peeking, and the glass nav. Place art is our own
 * gradient + glyph — never stock photos.
 */

export function DiscoverDemo({ progress }: { progress?: number }) {
  return (
    <PhoneShell>
      <MiniTopBar title="Tokyo" />

      {/* mode tabs */}
      <motion.div
        {...frame(progress, 0.03, { opacity: 0, y: -6 }, { opacity: 1, y: 0 })}
        className="shrink-0 flex items-center justify-center gap-1 pb-1.5"
      >
        <span className="h-6 px-2.5 rounded-full flex items-center text-[10px] font-semibold" style={{ color: APP.muted }}>
          Shortlist
        </span>
        <span className="h-6 px-2.5 rounded-full flex items-center text-[10px] font-extrabold" style={{ background: "rgba(245,245,247,0.14)", border: "1px solid rgba(245,245,247,0.2)" }}>
          For you
        </span>
      </motion.div>

      <div className="flex-1 min-h-0 px-1.5 flex flex-col gap-1.5 overflow-hidden relative">
        {/* the import door — over the stream like the real glass bar */}
        <motion.div
          {...frame(progress, 0.1, { opacity: 0, y: -8 }, { opacity: 1, y: 0 })}
          className="absolute top-1.5 inset-x-3 z-10 h-8 rounded-xl flex items-center gap-1.5 ps-1.5 pe-1 backdrop-blur"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <span className="flex -space-x-1">
            <span className="rounded-full bg-black flex items-center justify-center border border-white/25" style={{ width: 18, height: 18 }}>
              <TiktokLogo size={10} weight="fill" className="text-white" />
            </span>
            <span className="rounded-full flex items-center justify-center border border-white/25" style={{ width: 18, height: 18, background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }}>
              <InstagramLogo size={10} weight="fill" className="text-white" />
            </span>
          </span>
          <span className="text-[9px] font-bold flex-1 truncate text-white">Drop a link or screenshot</span>
          <span className="h-6 px-2.5 rounded-full text-[9px] font-bold text-white flex items-center" style={{ background: APP.brand }}>
            Import
          </span>
          <span className="rounded-full flex items-center justify-center" style={{ width: 22, height: 22, background: "rgba(255,255,255,0.12)" }}>
            <MapTrifold size={11} className="text-white" />
          </span>
        </motion.div>

        {/* the place card */}
        <motion.div
          {...frame(progress, 0.2, { opacity: 0, y: 16 }, { opacity: 1, y: 0 })}
          className="relative rounded-2xl overflow-hidden"
          style={{ flex: "1 1 72%", minHeight: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/screens/art/discover-card.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 45%, rgba(0,0,0,0.88))" }} />

          {/* side action rail */}
          <div className="absolute end-2 bottom-16 flex flex-col gap-2">
            {[Heart, BookmarkSimple, Plus].map((I, i) => (
              <motion.span
                key={i}
                {...frame(progress, 0.55 + i * 0.06, i === 0 ? { scale: 1 } : { opacity: 0.9 }, i === 0 ? { scale: [1, 1.25, 1] } : { opacity: 1 })}
                className="rounded-full flex items-center justify-center"
                style={{ width: 26, height: 26, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <I size={13} weight={i === 0 ? "fill" : "regular"} style={{ color: i === 0 ? APP.horizon : "#fff" }} />
              </motion.span>
            ))}
          </div>

          {/* name + meta — start-aligned, action rail on the other side */}
          <div className="absolute bottom-0 inset-x-0 px-2.5 pb-2 text-start">
            <p className="text-[13px] font-bold text-white leading-tight">Kokyo Gaien National Garden</p>
            <motion.span
              {...frame(progress, 0.42, { opacity: 0 }, { opacity: 1 })}
              className="inline-block mt-1 rounded px-1.5 py-0.5 text-[8px] font-semibold"
              style={{ background: "rgba(139,124,255,0.35)", color: "#E4DEFF" }}
            >
              Popular with travelers like you
            </motion.span>
            <div className="mt-1.5 flex items-center justify-start gap-1">
              {[
                <span key="r" className="inline-flex items-center gap-0.5"><Star size={8} weight="fill" style={{ color: APP.dune }} /> 4.4 · 9.9k</span>,
                <span key="c">Sights</span>,
                <span key="d" className="inline-flex items-center gap-0.5"><MapPin size={8} /> 621 m</span>,
              ].map((chip, i) => (
                <span key={i} className="h-5 px-1.5 rounded-full flex items-center text-[8px] font-bold text-white" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.18)" }}>
                  {chip}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[6px] text-white/50">Powered by Google</p>
          </div>
        </motion.div>

        {/* next card peeking */}
        <motion.div
          {...frame(progress, 0.75, { opacity: 0, y: 10 }, { opacity: 1, y: 0 })}
          className="relative rounded-t-2xl overflow-hidden"
          style={{ flex: "1 1 16%", minHeight: 24 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/screens/art/discover-next.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        </motion.div>
      </div>

      <MiniNav active="discover" />
    </PhoneShell>
  );
}
