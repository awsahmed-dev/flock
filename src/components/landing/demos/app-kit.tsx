"use client";

import type { ComponentType } from "react";
import {
  Airplane,
  TiktokLogo,
  InstagramLogo,
  CaretLeft,
  ChatCircle,
  CalendarDots,
  MapPin,
  Compass,
  Wallet,
  Plus,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Miniature versions of the app's two signature instruments — the boarding
 * Ticket and the Horizon — so the landing mockups ARE the current app
 * (dark theme, real hues, real anatomy), not a stylized cousin. Values are
 * hardcoded dark-theme tokens: the demos must look like the app even while
 * the landing page itself renders in daylight.
 */

export const APP = {
  bg: "#0D0D0D",
  card: "#1A1A1A",
  border: "#313131",
  fg: "#f5f5f7",
  muted: "#A9A5B2",
  ticketFg: "#111111",
  brand: "#8B7CFF",
  horizon: "#FF8A5C",
  wayfind: "#3EC5B7",
  moss: "#9BC97E",
  dune: "#E0B252",
} as const;

export type MiniHue = "brand" | "horizon" | "wayfind" | "dune";

/** The phone itself — same bezel/aspect as the real-screenshot phones. */
export function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border-[5px] border-[#141414] w-full h-full flex flex-col"
      style={{ aspectRatio: "1320 / 2868", background: APP.bg, color: APP.fg }}
    >
      {children}
      <div aria-hidden className="absolute inset-0 rounded-[23px] pointer-events-none" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)" }} />
    </div>
  );
}

/** The trip top bar: back · trip name · crew avatars · chat · me. */
export function MiniTopBar({ title }: { title: string }) {
  return (
    <div className="shrink-0 flex items-center gap-2 px-3 h-10" style={{ background: "#0D0D0D" }}>
      <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: APP.fg }}>
        <CaretLeft size={11} /> All trips
      </span>
      <span className="flex-1 text-center text-[12px] font-bold">{title}</span>
      <span className="flex -space-x-1">
        <span className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ width: 18, height: 18, background: "#0FA47A", color: "#fff" }}>MA</span>
        <span className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ width: 18, height: 18, background: "#E8A33D", color: "#fff" }}>A</span>
      </span>
      <ChatCircle size={14} style={{ color: APP.fg }} />
      <span className="rounded-full flex items-center justify-center text-[9px] font-bold" style={{ width: 20, height: 20, background: APP.brand, color: "#fff" }}>M</span>
    </div>
  );
}

const NAV_PILL = [
  { key: "now", label: "Now", icon: MapPin },
  { key: "discover", label: "Discover", icon: Compass },
  { key: "money", label: "Money", icon: Wallet },
] as const;

/** The glass bottom nav — standalone Plan circle · capsule · Add circle,
 *  exactly like the live app's bar. */
export function MiniNav({ active }: { active: "plan" | "now" | "discover" | "money" }) {
  return (
    <div className="shrink-0 flex items-center gap-1.5 px-2 pb-2 pt-1">
      <span
        className="shrink-0 rounded-full border flex flex-col items-center justify-center gap-0.5"
        style={{
          width: 38,
          height: 38,
          background: active === "plan" ? "rgba(139,124,255,0.18)" : "rgba(26,26,26,0.9)",
          borderColor: active === "plan" ? "rgba(139,124,255,0.4)" : APP.border,
        }}
      >
        <CalendarDots size={13} weight={active === "plan" ? "fill" : "regular"} style={{ color: active === "plan" ? APP.brand : APP.muted }} />
        <span className="text-[6px] font-semibold" style={{ color: active === "plan" ? APP.brand : APP.muted }}>Plan</span>
      </span>
      <div
        className="flex-1 flex items-center rounded-full border px-1 py-1 backdrop-blur"
        style={{ background: "rgba(26,26,26,0.85)", borderColor: APP.border }}
      >
        {NAV_PILL.map((n) => {
          const I = n.icon;
          const on = n.key === active;
          return (
            <span
              key={n.key}
              className="flex-1 h-8 rounded-full flex flex-col items-center justify-center gap-0.5"
              style={on ? { background: "rgba(139,124,255,0.18)" } : undefined}
            >
              <I size={13} weight={on ? "fill" : "regular"} style={{ color: on ? APP.brand : APP.muted }} />
              <span className="text-[7px] font-semibold" style={{ color: on ? APP.brand : APP.muted }}>{n.label}</span>
            </span>
          );
        })}
      </div>
      <span className="shrink-0 rounded-full flex flex-col items-center justify-center" style={{ width: 38, height: 38, background: APP.brand }}>
        <Plus size={13} weight="bold" style={{ color: "#fff" }} />
        <span className="text-[6px] font-bold" style={{ color: "#fff" }}>Add</span>
      </span>
    </div>
  );
}

/** The app's one primary action: a boarding stub with a tear-off GO. */
export function MiniTicket({
  hue, kicker, title, sub, icon: Icon,
}: {
  hue: MiniHue;
  kicker: string;
  title: string;
  sub?: string;
  icon: ComponentType<{ size?: number; weight?: "fill" | "regular" | "bold" }>;
}) {
  const bg = APP[hue];
  return (
    <div
      className="flex overflow-hidden rounded-2xl"
      style={{ color: APP.ticketFg, boxShadow: `0 10px 26px ${bg}45` }}
    >
      <div className="flex-1 min-w-0 px-3 py-2.5" style={{ background: bg }}>
        <p className="text-[9px] font-black tracking-[0.16em] uppercase opacity-70 truncate">{kicker}</p>
        <p className="text-[15px] font-black leading-tight mt-0.5 truncate">{title}</p>
        {sub && <p className="text-[11px] font-semibold opacity-80 mt-0.5 truncate">{sub}</p>}
      </div>
      <div
        className="relative w-[54px] shrink-0 flex flex-col items-center justify-center gap-0.5 border-s-2 border-dashed"
        style={{ background: bg, borderColor: "rgba(17,17,17,0.3)" }}
      >
        <span aria-hidden className="absolute -top-1.5 -start-1.5 w-3 h-3 rounded-full" style={{ background: APP.bg }} />
        <span aria-hidden className="absolute -bottom-1.5 -start-1.5 w-3 h-3 rounded-full" style={{ background: APP.bg }} />
        <Icon size={16} weight="fill" />
        <span className="text-[10px] font-black tracking-wider">GO</span>
      </div>
    </div>
  );
}

/** The Discover import door — TikTok + IG logos, one labelled action. */
export function MiniInspireBar() {
  return (
    <div
      className="h-10 rounded-xl flex items-center gap-2 ps-2 pe-1"
      style={{ background: APP.card, border: `1px solid ${APP.border}` }}
    >
      <span className="flex -space-x-1">
        <span className="w-6 h-6 rounded-full bg-black flex items-center justify-center border border-white/25">
          <TiktokLogo size={13} weight="fill" className="text-white" />
        </span>
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center border border-white/25"
          style={{ background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }}
        >
          <InstagramLogo size={13} weight="fill" className="text-white" />
        </span>
      </span>
      <span className="text-[11px] font-bold flex-1 truncate" style={{ color: APP.fg }}>
        Drop a link or screenshot
      </span>
      <span
        className="h-7 px-3 rounded-full text-[11px] font-bold text-white flex items-center"
        style={{ background: "#5B4BD9" }}
      >
        Import
      </span>
    </div>
  );
}

export interface MiniMark {
  at: number; // 0–100
  label: string;
  icon: ComponentType<{ size?: number; weight?: "fill" | "regular"; style?: React.CSSProperties }>;
  state: "later" | "due" | "done";
}

const MARK_COLOR = { later: "rgba(245,245,247,0.35)", due: APP.horizon, done: APP.moss } as const;

/** The Horizon: time as space — track, glowing now-dot, due-marks, plane. */
export function MiniHorizon({
  title, nowLabel, progress, marks, endIcon: End = Airplane,
}: {
  title: string;
  nowLabel: string;
  progress: number; // 0–100
  marks: MiniMark[];
  endIcon?: ComponentType<{ size?: number; weight?: "fill" | "regular"; style?: React.CSSProperties }>;
}) {
  return (
    <section className="rounded-2xl border px-3 pt-2.5 pb-2" style={{ background: APP.card, borderColor: APP.border }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-black tracking-[0.16em] uppercase truncate" style={{ color: APP.muted }}>{title}</p>
        <span className="text-[9px] font-bold inline-flex items-center gap-1 shrink-0" style={{ color: APP.horizon }}>
          <span className="w-1 h-1 rounded-full" style={{ background: APP.horizon }} />
          {nowLabel}
        </span>
      </div>
      <div className="relative h-[52px] ps-2 pe-9" dir="ltr">
        <div className="absolute inset-y-0 left-2 right-9">
          <div className="absolute inset-x-0 top-[22px] h-1 rounded-full" style={{ background: "rgba(245,245,247,0.08)" }} />
          <div
            className="absolute top-[22px] h-1 rounded-full transition-[width] duration-200"
            style={{
              left: 0,
              width: `${Math.max(0, Math.min(100, progress))}%`,
              background: `linear-gradient(90deg, ${APP.moss} 0%, ${APP.moss} 60%, ${APP.dune} 100%)`,
              boxShadow: `0 0 10px ${APP.moss}66`,
            }}
          />
          <div
            className="absolute top-[16px] -translate-x-1/2 z-10 w-[13px] h-[13px] rounded-full transition-[left] duration-200"
            style={{
              left: `${Math.max(0, Math.min(100, progress))}%`,
              background: APP.horizon,
              boxShadow: `0 0 0 4px ${APP.horizon}38, 0 0 12px ${APP.horizon}99`,
            }}
          />
          {marks.map((m) => {
            const I = m.icon;
            const col = MARK_COLOR[m.state];
            const chip = m.state === "due" ? `${APP.horizon}26` : m.state === "done" ? `${APP.moss}26` : APP.card;
            return (
              <div key={m.label} className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${m.at}%`, top: 0 }}>
                <span
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center border"
                  style={{ background: chip, borderColor: m.state === "later" ? "rgba(245,245,247,0.15)" : col }}
                >
                  <I size={12} weight={m.state === "done" ? "fill" : "regular"} style={{ color: col }} />
                </span>
                <span className="mt-[10px] w-1 h-1 rounded-full" style={{ background: col }} />
                <span className="mt-0.5 text-[8px] whitespace-nowrap font-semibold" style={{ color: col }}>{m.label}</span>
              </div>
            );
          })}
        </div>
        <div
          className="absolute right-0 top-[13px] w-[26px] h-[26px] rounded-full border flex items-center justify-center"
          style={{ borderColor: APP.border, background: "rgba(245,245,247,0.06)" }}
        >
          <End size={12} weight="fill" style={{ color: "rgba(245,245,247,0.8)" }} />
        </div>
      </div>
    </section>
  );
}
