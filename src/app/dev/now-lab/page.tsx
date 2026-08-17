"use client";

/**
 * DEV PREVIEW — the Now page in three proposals × four moments.
 *
 *   A  Auditor  — his fixes applied literally (LIVE sheet defaults to half,
 *                 recap gated on remaining stops, ladder time-weighted).
 *   B  Moment   — one clock: tripMoment() beside tripPhase(); content-sized
 *                 peek that opens to half only when a stop is imminent, ladder
 *                 with a "nothing due" floor, phase-weighted readiness, last-day
 *                 "Departure tonight" card.
 *   C  The Line — out of the box: the present is a fixed line on the screen and
 *                 the trip flows past it. No sheet, no detents, no map hero. The
 *                 next thing is always pinned under the line; the map is a chip
 *                 inside it. Same metaphor in every phase.
 *
 * Mock data, no DB, no map. Not linked; 404 in production.
 */

import { useState } from "react";
import { notFound } from "next/navigation";
import {
  MapPin, NavigationArrow, Check, Sun, Airplane, Bed, ForkKnife, Camera, Users, Wallet, Package,
  Sparkle, CaretRight, CalendarDots, Compass, FileText, ChatCircle, Ticket, Moon,
} from "@phosphor-icons/react/dist/ssr";

// ─── moments ─────────────────────────────────────────────────────────────────
type MomentKey = "EMPTY" | "T49" | "T3" | "LIVE_AM" | "LIVE_LAST" | "RECAP";
const MOMENTS: { key: MomentKey; label: string; phase: "PLANNING" | "DEPARTURE" | "LIVE" | "RECAP"; sub: string }[] = [
  { key: "EMPTY", label: "T−21 · brand new", phase: "PLANNING", sub: "Kyoto · 0 stops · just you · nothing set" },
  { key: "T49", label: "T−49 · planning", phase: "PLANNING", sub: "Tokyo · 12 stops · 4 crew · budget set · nothing packed" },
  { key: "T3", label: "T−3 · departure", phase: "DEPARTURE", sub: "Tokyo · docs 1/2 · packed 4/18" },
  { key: "LIVE_AM", label: "Live · day 2 · 09:40", phase: "LIVE", sub: "Seoul · 4 stops today · next in 1h20" },
  { key: "LIVE_LAST", label: "Live · final day · 21:59", phase: "LIVE", sub: "Seoul · 1 of 4 done · flight 23:10" },
  { key: "RECAP", label: "Home · +2 days", phase: "RECAP", sub: "Seoul · 9 stops · USD 1,120 · 2 unsettled" },
];

type Stop = { time: string; title: string; place: string; icon: typeof MapPin; done?: boolean; missed?: boolean };
const DAY2: Stop[] = [
  { time: "08:30", title: "Breakfast at Onion Anguk", place: "Jongno-gu", icon: ForkKnife, done: true },
  { time: "11:00", title: "Gyeongbokgung Palace", place: "Sajik-ro 161", icon: Camera },
  { time: "14:00", title: "Bukchon Hanok Village", place: "Gye-dong", icon: MapPin },
  { time: "19:30", title: "Gwangjang Market dinner", place: "Jongno 4-ga", icon: ForkKnife },
];
// 21:59 on the last day: checkout done, two stops missed (past, not marked),
// the flight is what's next. This is the auditor's exact scenario.
const LAST: Stop[] = [
  { time: "10:00", title: "Hotel checkout", place: "Ryse Hotel, Hongdae", icon: Bed, done: true },
  { time: "13:00", title: "Namsan Seoul Tower", place: "Yongsan-gu", icon: Camera, missed: true },
  { time: "18:00", title: "Sunset at Han River", place: "Yeouido", icon: Sun, missed: true },
  { time: "23:10", title: "Flight KE 957 → RUH", place: "Incheon T2 · gate 246", icon: Airplane },
];

const c = {
  card: "rounded-2xl border border-white/10 bg-[#1a1a1c]",
  chip: "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase",
};

// ─── phone frame ─────────────────────────────────────────────────────────────
function Phone({ title, children, dark = true }: { title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-bold tracking-wider uppercase text-white/60">{title}</p>
      <div
        className="relative overflow-hidden rounded-[28px] border border-white/15 shadow-2xl"
        style={{ width: 390, height: 844, background: dark ? "#0d0d0d" : "#fff", color: "#f5f5f7" }}
      >
        <div className="h-14 px-4 flex items-center justify-between text-[15px] font-bold border-b border-white/5">
          <span className="text-white/70">‹ All trips</span><span>Seoul</span><span className="w-8" />
        </div>
        <div className="absolute inset-x-0 top-14 bottom-0 overflow-hidden">{children}</div>
        <Nav />
      </div>
    </div>
  );
}
function Nav() {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 px-4 pb-3 pointer-events-none">
      <div className="w-14 h-14 rounded-full bg-[#1a1a1a]/90 border border-white/10 flex flex-col items-center justify-center text-[10px] font-bold gap-0.5"><CalendarDots size={20} />Plan</div>
      <div className="flex-1 h-14 rounded-full bg-[#1a1a1a]/90 border border-white/10 flex items-center justify-around text-[10px] font-bold">
        <span className="flex flex-col items-center gap-0.5 rounded-full bg-white/10 px-4 py-1.5"><MapPin size={20} weight="fill" />Now</span>
        <span className="flex flex-col items-center gap-0.5"><Compass size={20} />Discover</span>
        <span className="flex flex-col items-center gap-0.5"><Wallet size={20} />Money</span>
      </div>
      <div className="w-14 h-14 rounded-full bg-[#8B7CFF] text-black flex flex-col items-center justify-center text-[10px] font-bold gap-0.5"><span className="text-xl leading-none">+</span>Add</div>
    </div>
  );
}
function MapBg({ h = "100%" }: { h?: string }) {
  return (
    <div className="absolute inset-x-0 top-0" style={{ height: h, background: "radial-gradient(120% 80% at 30% 20%, #2a2a33 0%, #17171b 60%, #111 100%)" }}>
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 390 800" fill="none" stroke="#8b8b99" strokeWidth="1">
        {[60, 140, 220, 300, 380, 460, 540, 620, 700].map((y) => <line key={y} x1="0" y1={y} x2="390" y2={y + 40} />)}
        {[40, 120, 200, 280, 360].map((x) => <line key={x} x1={x} y1="0" x2={x + 60} y2="800" />)}
      </svg>
      <span className="absolute left-4 top-4 text-[11px] text-white/40">Seoul · map</span>
    </div>
  );
}
function UpNext({ s, tall = false, eta }: { s: Stop; tall?: boolean; eta?: string }) {
  const I = s.icon;
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wider text-[#8B7CFF]">UP NEXT · {s.time}{eta ? ` · ${eta}` : ""}</p>
      <p className={`font-bold mt-0.5 ${tall ? "text-[20px]" : "text-[17px]"}`}>{s.title}</p>
      <p className="text-[13px] text-white/60 flex items-center gap-1"><I size={14} />{s.place}</p>
      <div className="flex gap-2 mt-3">
        <button className="flex-1 h-12 rounded-xl bg-[#8B7CFF] text-black font-bold text-sm flex items-center justify-center gap-1.5"><NavigationArrow size={16} weight="fill" />Navigate</button>
        <button className="flex-1 h-12 rounded-xl border border-white/15 font-bold text-sm flex items-center justify-center gap-1.5"><Check size={16} weight="bold" />Done</button>
      </div>
    </div>
  );
}
function Sheet({ children, height, label }: { children: React.ReactNode; height: number | "auto"; label: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-[#141416] border-t border-white/10 px-4 pt-2" style={{ height, paddingBottom: 96 }}>
      <div className="mx-auto w-9 h-1 rounded-full bg-white/25 mb-3" />
      <span className="absolute right-3 top-2 text-[9px] text-white/30">{label}</span>
      {children}
    </div>
  );
}
function Hero({ eyebrow, name, sub }: { eyebrow: string; name: string; sub: string }) {
  return (
    <div className="relative h-[220px] px-4 pt-3 flex flex-col justify-between" style={{ background: "linear-gradient(180deg,#3d3866 0%,#1c1a2e 70%,#0d0d0d 100%)" }}>
      <span className={`${c.chip} self-start border border-orange-300/60 text-orange-300`}>{eyebrow}</span>
      <div className="pb-3"><p className="text-4xl font-black">{name}</p><p className="text-white/70 text-[15px]">{sub}</p></div>
    </div>
  );
}
type CtaStyle = "pill" | "hue" | "card" | "ticket";
const HUE = { horizon: "#FF8A5C", dune: "#E0B252", wayfind: "#3EC5B7", brand: "#8B7CFF" } as const;
function Cta({ icon: I, label, primary = true, style = "pill", hue = "brand", support, urgency }: {
  icon: typeof MapPin; label: string; primary?: boolean; style?: CtaStyle; hue?: keyof typeof HUE; support?: string; urgency?: string;
}) {
  const col = HUE[hue];
  if (!primary) return (
    <div className="h-14 rounded-full flex items-center gap-3 px-5 font-bold text-[16px] border-[1.5px] border-white/20 text-white"><I size={20} />{label}<CaretRight className="ms-auto text-white/50" /></div>
  );
  if (style === "pill") return (
    <div className="h-16 rounded-full flex items-center gap-3 px-5 font-bold text-[17px] bg-[#8B7CFF] text-black"><I size={22} />{label}<CaretRight className="ms-auto" /></div>
  );
  if (style === "hue") return (
    <div className="h-16 rounded-full flex items-center gap-3 px-5 font-bold text-[17px] text-black" style={{ background: col, boxShadow: `0 10px 30px ${col}55` }}><I size={22} weight="fill" />{label}<CaretRight className="ms-auto" /></div>
  );
  if (style === "card") return (
    <div className="relative rounded-3xl p-4 text-black overflow-hidden" style={{ background: `linear-gradient(135deg, ${col} 0%, ${col}dd 100%)`, boxShadow: `0 14px 40px ${col}55, inset 0 1px 0 rgba(255,255,255,.35)` }}>
      <div className="flex items-start justify-between">
        <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-black tracking-wider uppercase">{urgency ?? "Do this next"}</span>
        <I size={22} weight="fill" className="opacity-80" />
      </div>
      <p className="text-[22px] font-black leading-tight mt-2">{label}</p>
      {support && <p className="text-[13px] font-semibold opacity-80 mt-0.5">{support}</p>}
      <div className="mt-3 h-11 rounded-full bg-black text-white flex items-center justify-center gap-1.5 font-bold text-[14px]">Open <CaretRight size={14} weight="bold" /></div>
    </div>
  );
  // ticket: boarding-pass stub — the brand motif from the auth shell
  return (
    <div className="relative flex rounded-2xl overflow-hidden text-black" style={{ boxShadow: `0 14px 40px ${col}44` }}>
      <div className="flex-1 p-4" style={{ background: col }}>
        <p className="text-[10px] font-black tracking-[0.2em] uppercase opacity-70">{urgency ?? "Now boarding"}</p>
        <p className="text-[19px] font-black leading-tight mt-1">{label}</p>
        {support && <p className="text-[12px] font-semibold opacity-80 mt-0.5">{support}</p>}
      </div>
      <div className="relative w-[84px] flex flex-col items-center justify-center gap-1 border-s-2 border-dashed border-black/30" style={{ background: col }}>
        <span className="absolute -top-2 -start-2 w-4 h-4 rounded-full bg-[#0d0d0d]" /><span className="absolute -bottom-2 -start-2 w-4 h-4 rounded-full bg-[#0d0d0d]" />
        <I size={22} weight="fill" /><span className="text-[11px] font-black">GO</span>
      </div>
    </div>
  );
}
function Ready({ label, pct }: { label: string; pct: number }) {
  return (
    <div className={`${c.card} h-[76px] px-5 flex items-center gap-4`}>
      <div className="flex-1 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-[#7CCF7C]" style={{ width: `${pct}%` }} /></div>
      <span className="font-bold text-[15px]">{label}</span>
    </div>
  );
}
function Cells({ items }: { items: [typeof MapPin, string, string][] }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map(([I, l, v]) => (
        <div key={l} className={`${c.card} p-3 min-h-[72px] flex flex-col justify-between`}>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-white/50"><I size={16} className="text-[#8B7CFF]" />{l}</span>
          <span className="text-[15px] font-bold">{v}</span>
        </div>
      ))}
    </div>
  );
}


// ─── 4 · HORIZON: time as space + postcards, not a list ──────────────────────
function HorizonStrip({ nowLabel, marks, progress }: { nowLabel: string; marks: { at: number; label: string; hot?: boolean }[]; progress: number }) {
  return (
    <div className="px-1 pt-1">
      <div className="relative h-9">
        <div className="absolute inset-x-0 top-4 h-[3px] rounded-full bg-white/10" />
        <div className="absolute top-4 h-[3px] rounded-full bg-[#7CCF7C]" style={{ left: 0, width: `${progress}%` }} />
        {/* now */}
        <div className="absolute top-[9px] -translate-x-1/2" style={{ left: `${progress}%` }}>
          <div className="w-[13px] h-[13px] rounded-full bg-orange-300 ring-4 ring-orange-300/25" />
          <span className="absolute -top-0.5 start-4 text-[10px] font-black tracking-wider text-orange-300 whitespace-nowrap">{nowLabel}</span>
        </div>
        {marks.map((m) => (
          <div key={m.label} className="absolute -translate-x-1/2" style={{ left: `${m.at}%` }}>
            <div className={`mt-[13px] w-[7px] h-[7px] rounded-full ${m.hot ? "bg-orange-300" : "bg-white/40"}`} />
            <span className={`absolute top-6 -translate-x-1/2 start-1 text-[10px] whitespace-nowrap ${m.hot ? "text-orange-300 font-bold" : "text-white/45"}`}>{m.label}</span>
          </div>
        ))}
        <Airplane size={14} weight="fill" className="absolute -end-0.5 top-[10px] text-white/70" />
      </div>
    </div>
  );
}
function Postcard({ img, kicker, title, lines, wide = false, tint }: { img: string; kicker: string; title: string; lines: string[]; wide?: boolean; tint?: string }) {
  return (
    <div className={`relative shrink-0 snap-start overflow-hidden rounded-2xl ${wide ? "w-[300px]" : "w-[190px]"} h-[150px]`} style={{ backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0" style={{ background: tint ?? "linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.75) 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-[10px] font-black tracking-wider uppercase text-white/70">{kicker}</p>
        <p className="text-[16px] font-bold leading-tight">{title}</p>
        {lines.map((l) => <p key={l} className="text-[12px] text-white/80">{l}</p>)}
      </div>
    </div>
  );
}
const pic = (seed: string) => `https://picsum.photos/seed/${seed}/600/400`;

// ─── A · auditor ─────────────────────────────────────────────────────────────
function VariantA({ m }: { m: MomentKey }) {
  if (m === "EMPTY" || m === "RECAP") return <div className="p-6 text-white/40 text-sm">not drawn for this moment</div>;
  if (m === "T49" || m === "T3") {
    const dep = m === "T3";
    return (
      <div className="h-full overflow-hidden">
        <Hero eyebrow={dep ? "IN 3 DAYS" : "IN 49 DAYS"} name="Tokyo" sub="Tokyo, Japan · 6 Oct – 12 Oct 2026" />
        <div className="px-4 pt-4 space-y-3">
          {/* his #2: "what's due" line replaces the manufactured task */}
          <div className={`${c.card} px-4 py-3`}>
            <p className="text-[11px] font-bold tracking-wider text-[#8B7CFF]">WHAT&apos;S DUE</p>
            <p className="text-[15px] font-semibold mt-0.5">{dep ? "Pack — 4 of 18 · Add passport scan" : "1 decision open · nothing else due"}</p>
          </div>
          <Cta icon={dep ? Package : ChatCircle} label={dep ? "Keep packing · 22%" : "Vote: Nikko or Hakone?"} />
          {/* his #4: two things outstanding instead of a % */}
          <div className={`${c.card} px-4 py-3 text-[14px]`}>
            <p className="font-bold">Outstanding</p>
            <p className="text-white/70">· pack (0/18) · 1 decision open</p>
          </div>
          {/* his #3: chips relabelled */}
          <div className="flex gap-2 overflow-hidden">
            {["Mon 5 · 3 stops →", "Tue 6 · 2 stops →", "Wed 7 · 2 stops →"].map((x) => <span key={x} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-[13px] font-semibold">{x}</span>)}
          </div>
          <Cells items={[[Wallet, "Budget", "USD 8,000"], [Users, "Crew", "4 people"], [Package, "Packing", dep ? "4/18" : "Start packing"]]} />
        </div>
      </div>
    );
  }
  const last = m === "LIVE_LAST";
  const stops = last ? LAST : DAY2;
  const next = stops.find((x) => !x.done && !x.missed)!;
  // his #1: LIVE detent defaults to HALF (55%)
  const H = Math.round(790 * 0.55);
  return (
    <div className="h-full">
      <MapBg />
      <Sheet height={H} label="detent: half (always)">
        {last && <p className="text-[12px] font-bold text-orange-300 mb-2">Final day 🌅</p>}
        <UpNext s={next} eta={last ? "in 1h11" : "in 1h20"} />
        <div className="mt-4 space-y-2">
          {stops.map((s) => (
            <div key={s.title} className={`flex items-center gap-3 text-[14px] ${s.done ? "opacity-40 line-through" : s.missed ? "opacity-60" : ""}`}>
              <span className="w-12 text-white/50 tabular-nums">{s.time}</span><span className="font-semibold">{s.title}</span>{s.missed && <span className="ms-auto text-[10px] text-white/40">not marked</span>}
            </div>
          ))}
        </div>
        {/* his #1 recap gate: not shown at 21:59 because stops remain */}
        <p className="mt-3 text-[11px] text-white/40">recap: {last ? "suppressed — 3 stops remain" : "n/a"}</p>
      </Sheet>
    </div>
  );
}

// ─── B · one clock (tripMoment) ───────────────────────────────────────────────
type Below = "today" | "fold" | "strip" | "line" | "horizon";
function VariantB({ m, cta = "pill", below = "today" }: { m: MomentKey; cta?: CtaStyle; below?: Below }) {
  if (m === "EMPTY" || m === "RECAP") return <div className="p-6 text-white/40 text-sm">not drawn for this moment</div>;
  if (m === "T49" || m === "T3") {
    const dep = m === "T3";
    return (
      <div className="h-full overflow-hidden">
        <Hero eyebrow={dep ? "IN 3 DAYS" : "IN 49 DAYS"} name="Tokyo" sub="Tokyo, Japan · 6 Oct – 12 Oct 2026" />
        <div className="px-4 pt-4 space-y-3">
          {dep ? (
            <>
              {/* DEPARTURE cockpit already owns packing — untouched */}
              <Cta icon={Package} label="Pack — 14 left" support="18 items · flight in 3 days" urgency="Due now" hue="dune" style={cta} />
              {below === "horizon" ? (
                <>
                  <HorizonStrip nowLabel="T−3" progress={88} marks={[{ at: 62, label: "budget" }, { at: 78, label: "docs", hot: true }, { at: 92, label: "pack", hot: true }]} />
                  <div className="flex gap-2.5 overflow-hidden -me-4 pt-1">
                    <Postcard img={pic("boarding-pass")} kicker="Oct 6 · 09:15" title="SV 826 · RUH → NRT" lines={["Gate opens 08:15 · 4 crew on it"]} wide tint="linear-gradient(180deg, rgba(20,20,40,.35), rgba(0,0,0,.85))" />
                    <Postcard img={pic("shinjuku-hotel")} kicker="Night 1" title="Shinjuku Granbell" lines={["check-in 15:00 · 2 rooms"]} />
                    <Postcard img={pic("tokyo-shibuya")} kicker="Tokyo on Oct 6" title="24° · light rain" lines={["pack a shell · umbrella ✔"]} />
                  </div>
                  <div className="rounded-2xl border border-orange-300/40 bg-orange-300/10 px-4 py-2.5 text-[13px] flex items-center gap-2"><FileText size={16} className="text-orange-300" /><span><span className="font-bold text-orange-300">Passport scan missing</span> · add before T−1</span><CaretRight size={14} className="ms-auto text-orange-300" /></div>
                </>
              ) : below === "today" || below === "fold" ? (
                <>
                  <Ready label={below === "fold" ? "Docs still due" : "4 of 5 due · docs"} pct={80} />
                  <div className={`${c.card} px-4 py-3 text-[14px] space-y-1`}>
                    <p className="font-bold">Departure board</p>
                    <p className="text-white/70">✈ SV 826 · 06 Oct 09:15 · RUH → NRT</p>
                    <p className="text-white/70">🛏 Shinjuku Granbell · check-in 15:00</p>
                    <p className="text-orange-300">📄 Passport scan missing → add</p>
                  </div>
                </>
              ) : below === "strip" ? (
                <>
                  <div className="flex gap-2 overflow-hidden -me-4">
                    {[["!", "docs due"], ["4/18", "packed"], ["4", "crew ready"], ["3d", "to go"]].map(([k, v]) => (
                      <span key={v} className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] font-semibold flex items-center gap-1.5"><span className="text-orange-300 text-[11px]">{k}</span>{v}</span>
                    ))}
                  </div>
                  <div className={`${c.card} px-4 py-3 text-[14px] space-y-1`}>
                    <p className="font-bold">Departure board</p>
                    <p className="text-white/70">✈ SV 826 · 06 Oct 09:15 · RUH → NRT</p>
                    <p className="text-white/70">🛏 Shinjuku Granbell · check-in 15:00</p>
                    <p className="text-orange-300">📄 Passport scan missing → add</p>
                  </div>
                </>
              ) : (
                <div className={`${c.card} p-4`}>
                  <p className="text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">Coming up</p>
                  <div className="relative ms-2 border-s border-white/10 ps-5 space-y-3">
                    {[["T−1", "Passport scan → docs", FileText, "missing"], ["Oct 6", "SV 826 · RUH → NRT", Airplane, "09:15"], ["Oct 6", "Shinjuku Granbell", Bed, "check-in 15:00"], ["Oct 6", "Day 1 · 3 stops", MapPin, "Shibuya"]].map(([w, t, I, sub]) => (
                      <div key={t as string} className="relative flex items-center gap-3">
                        <span className="absolute -start-[25px] top-1.5 w-2.5 h-2.5 rounded-full border border-white/40 bg-[#1a1a1c]" />
                        <span className="w-12 text-[12px] text-white/50">{w as string}</span><I size={16} className="text-white/60" />
                        <span className="text-[14px] font-semibold">{t as string}</span><span className="ms-auto text-[12px] text-orange-300/90">{sub as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* ladder floor: nothing due at T-49 → say so, point at Discover */}
              <Cta icon={ChatCircle} label="Nikko or Hakone?" support="Crew vote · 2 of 4 voted · closes tonight" urgency="Your vote's missing" hue="horizon" style={cta} />
              {below === "today" && (
                <>
                  <div className={`${c.card} px-4 py-3`}>
                    <p className="text-[15px] font-semibold">Nothing else due · 49 days out</p>
                    <p className="text-[13px] text-[#8B7CFF] font-semibold">Go heart something in Discover →</p>
                  </div>
                  <Ready label="3 of 3 due · on track" pct={100} />
                  <div className="flex gap-2 overflow-hidden">
                    {["Mon 5 ·3", "Tue 6 ·2", "Wed 7 ·2", "Thu 8 ·1"].map((x) => <span key={x} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-[13px] font-semibold">{x}</span>)}
                  </div>
                  <Cells items={[[Wallet, "Budget", "USD 8,000"], [Users, "Crew", "4 people"], [Package, "Packing", "Due T−2"]]} />
                </>
              )}
              {below === "fold" && (
                <>
                  {/* 1 · FOLD: two blocks. Readiness absorbs the "nothing due" line;
                      chips + cells become one quiet overview card. */}
                  <div className={`${c.card} px-5 py-4`}>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-[#7CCF7C]" style={{ width: "100%" }} /></div>
                      <span className="font-bold text-[15px]">On track</span>
                    </div>
                    <p className="text-[13px] text-white/60 mt-2">3 of 3 due done · nothing else until T−14 · <span className="text-[#8B7CFF] font-semibold">heart places in Discover →</span></p>
                  </div>
                  <div className={`${c.card} divide-y divide-white/5`}>
                    {[[CalendarDots, "7 days · 12 stops planned", "Plan"], [Users, "4 crew · all in", "Crew"], [Wallet, "USD 8,000 budget · 0 spent", "Money"], [Package, "Packing opens T−2", ""]].map(([I, t, go]) => (
                      <div key={t as string} className="flex items-center gap-3 px-4 h-12 text-[14px]"><I size={18} className="text-white/60" /><span className="font-semibold flex-1">{t as string}</span>{go ? <span className="text-[12px] text-white/40 flex items-center">{go as string} <CaretRight size={12} /></span> : null}</div>
                    ))}
                  </div>
                </>
              )}
              {below === "strip" && (
                <>
                  {/* 2 · STRIP: one scrolling status strip, then the crew — the
                      product. Days/metrics live in their own tabs. */}
                  <div className="flex gap-2 overflow-hidden -me-4">
                    {[["●", "On track"], ["7d", "12 stops"], ["4", "crew"], ["$", "8,000"], ["T−2", "pack"]].map(([k, v]) => (
                      <span key={v} className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] font-semibold flex items-center gap-1.5"><span className="text-[#7CCF7C] text-[11px]">{k}</span>{v}</span>
                    ))}
                  </div>
                  <div className={`${c.card} p-4`}>
                    <p className="text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">Crew · 4 going</p>
                    <div className="flex items-center gap-2 mb-3">{["M", "R", "S", "A"].map((x, i) => <span key={x} className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: ["#3EC5B7", "#FF8A5C", "#E0B252", "#8B7CFF"][i], color: "#111" }}>{x}</span>)}</div>
                    <p className="text-[14px]"><span className="font-semibold">Rania</span> hearted <span className="font-semibold">TeamLab Planets</span> · 2h</p>
                    <p className="text-[14px] text-white/70 mt-1"><span className="font-semibold text-white">Sami</span> added a stop to Wed 7 · yesterday</p>
                    <p className="text-[13px] text-[#8B7CFF] font-semibold mt-2">Nothing else due · go heart something in Discover →</p>
                  </div>
                </>
              )}
              {below === "horizon" && (
                <>
                  <HorizonStrip nowLabel="T−49" progress={18} marks={[{ at: 62, label: "budget" }, { at: 78, label: "docs" }, { at: 92, label: "pack" }]} />
                  <div className="flex gap-2.5 overflow-hidden -me-4 pt-1">
                    <Postcard img={pic("tokyo-shibuya")} kicker="Tokyo right now" title="27° · clear · 18:03 sunset" lines={["¥ 156 = $1 · 6h ahead of you"]} />
                    <Postcard img={pic("tokyo-day1")} kicker="Your day 1 · Oct 6" title="Shibuya crossing → ramen" lines={["3 stops · lands 15:00 · hotel 15:30"]} />
                    <Postcard img={pic("teamlab-planets")} kicker="Crew is looking at" title="TeamLab Planets" lines={["Rania ♥ · 2h ago · not on the plan yet"]} />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex -space-x-2">{["M", "R", "S", "A"].map((x, i) => <span key={x} className="w-7 h-7 rounded-full ring-2 ring-[#0d0d0d] flex items-center justify-center text-[11px] font-bold" style={{ background: ["#3EC5B7", "#FF8A5C", "#E0B252", "#8B7CFF"][i], color: "#111" }}>{x}</span>)}</div>
                    <p className="text-[13px] text-white/60">4 going · 12 stops · USD 8,000 · <span className="text-[#8B7CFF] font-semibold">Discover →</span></p>
                  </div>
                </>
              )}
              {below === "line" && (
                <>
                  {/* 3 · LINE-LITE: what's coming, in order, replaces bar + chips
                      + cells. The ticket is "now"; this is "next". */}
                  <div className={`${c.card} p-4`}>
                    <p className="text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">Coming up</p>
                    <div className="relative ms-2 border-s border-white/10 ps-5 space-y-3">
                      {[["T−14", "Budget check-in", Wallet, "USD 8,000 set"], ["T−7", "Docs", FileText, "passport · hotel"], ["T−2", "Pack", Package, "18 items"], ["Oct 6", "SV 826 · RUH → NRT", Airplane, "09:15"]].map(([w, t, I, sub]) => (
                        <div key={t as string} className="relative flex items-center gap-3">
                          <span className="absolute -start-[25px] top-1.5 w-2.5 h-2.5 rounded-full border border-white/40 bg-[#1a1a1c]" />
                          <span className="w-12 text-[12px] text-white/50">{w as string}</span><I size={16} className="text-white/60" />
                          <span className="text-[14px] font-semibold">{t as string}</span><span className="ms-auto text-[12px] text-white/40">{sub as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[13px] text-white/50 px-1">Nothing due today · <span className="text-[#8B7CFF] font-semibold">heart places in Discover →</span></p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  const last = m === "LIVE_LAST";
  const stops = last ? LAST : DAY2;
  const next = stops.find((s) => !s.done && !s.missed)!;
  // content-sized peek: the sheet is as tall as UpNext needs (+ nav clearance),
  // never a fixed 172px. It opens to HALF only when the next stop is ≤ 2h away
  // — true in both LIVE moments here, so we show the half state on day 2 and
  // the content-sized peek on the last night to demonstrate both.
  const imminent = m === "LIVE_AM";
  const H: number | "auto" = imminent ? Math.round(790 * 0.55) : "auto";
  return (
    <div className="h-full">
      <MapBg />
      <Sheet height={H} label={imminent ? "detent: half (stop in 1h20)" : "detent: peek (content-sized)"}>
        {last ? (
          <div className="mb-3 rounded-xl border border-orange-300/40 bg-orange-300/10 px-3 py-2">
            <p className="text-[12px] font-bold text-orange-300 flex items-center gap-1"><Moon size={14} weight="fill" />Departure tonight · KE 957 23:10</p>
            <p className="text-[12px] text-white/70">Checkout done · 2 stops left · leave for ICN by 20:30</p>
          </div>
        ) : null}
        <UpNext s={next} eta={last ? "in 1h11" : "in 1h20"} />
        {imminent && (
          <div className="mt-4 space-y-2">
            {stops.map((s) => (
              <div key={s.title} className={`flex items-center gap-3 text-[14px] ${s.done ? "opacity-40 line-through" : ""}`}>
                <span className="w-12 text-white/50 tabular-nums">{s.time}</span><span className="font-semibold">{s.title}</span>
              </div>
            ))}
          </div>
        )}
        {last && <p className="mt-2 text-[12px] text-white/50">2 stops passed unmarked — mark done or let them go; the recap waits for the flight.</p>}
      </Sheet>
    </div>
  );
}

// ─── C · The Line ─────────────────────────────────────────────────────────────
function LineRow({ s, state, eta }: { s: Stop; state: "past" | "next" | "later" | "missed"; eta?: string }) {
  const I = s.icon;
  if (state === "next") {
    return (
      <div className="relative ms-9 me-4 rounded-2xl bg-[#1a1a1c] border border-[#8B7CFF]/50 p-4">
        <span className="absolute -start-9 top-4 w-4 h-4 rounded-full bg-[#8B7CFF] ring-4 ring-[#8B7CFF]/25 -translate-x-1/2 ms-[18px]" />
        <p className="text-[11px] font-bold tracking-wider text-[#8B7CFF]">NEXT · {s.time}{eta ? ` · ${eta}` : ""}</p>
        <p className="text-[20px] font-bold mt-0.5 leading-tight">{s.title}</p>
        <p className="text-[13px] text-white/60 flex items-center gap-1 mt-0.5"><I size={14} />{s.place}</p>
        {/* map is a chip inside the next thing */}
        <div className="mt-3 h-24 rounded-xl overflow-hidden relative border border-white/10"><MapBg h="100%" /><span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold">12 min walk · open map</span></div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 h-12 rounded-xl bg-[#8B7CFF] text-black font-bold text-sm flex items-center justify-center gap-1.5"><NavigationArrow size={16} weight="fill" />Navigate</button>
          <button className="flex-1 h-12 rounded-xl border border-white/15 font-bold text-sm flex items-center justify-center gap-1.5"><Check size={16} weight="bold" />Done</button>
        </div>
      </div>
    );
  }
  return (
    <div className={`relative ms-9 me-4 flex items-center gap-3 py-2.5 ${state === "past" ? "opacity-40" : state === "missed" ? "opacity-70" : ""}`}>
      <span className={`absolute -start-9 w-2.5 h-2.5 rounded-full ${state === "past" ? "bg-white/40" : state === "missed" ? "border border-orange-300/70" : "bg-white/20 border border-white/40"} ms-[21px]`} />
      <span className="w-12 text-[13px] text-white/50 tabular-nums">{s.time}</span>
      <I size={16} className="text-white/60" />
      <span className={`text-[15px] font-semibold ${state === "past" ? "line-through" : ""}`}>{s.title}</span>
      {state === "past" && <Check size={14} className="ms-auto text-[#7CCF7C]" weight="bold" />}
      {state === "missed" && <span className="ms-auto rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold">Done?</span>}
    </div>
  );
}
function NowLine({ label }: { label: string }) {
  return (
    <div className="relative my-2 flex items-center">
      <span className="absolute start-6 w-3 h-3 rounded-full bg-orange-300 -translate-x-1/2 ms-[6px]" />
      <div className="ms-9 flex-1 border-t-2 border-dashed border-orange-300/70" />
      <span className="ms-2 me-4 text-[11px] font-black tracking-wider text-orange-300">{label}</span>
    </div>
  );
}
function VariantC({ m }: { m: MomentKey }) {
  if (m === "EMPTY" || m === "RECAP") return <div className="p-6 text-white/40 text-sm">not drawn for this moment</div>;
  const live = m === "LIVE_AM" || m === "LIVE_LAST";
  const last = m === "LIVE_LAST";
  const stops = last ? LAST : DAY2;
  const nextIdx = stops.findIndex((x) => !x.done && !x.missed);
  const rail = "absolute left-6 top-0 bottom-0 w-px bg-white/10 ms-[5px]";
  if (live) {
    return (
      <div className="h-full relative overflow-hidden">
        <div className={rail} />
        <div className="pt-3">
          <p className="ms-9 me-4 text-[11px] font-bold tracking-wider text-white/40">{last ? "FINAL DAY · SEOUL" : "DAY 2 · SEOUL"} · {last ? "SUN 13 SEP" : "TUE 8 SEP"}</p>
          {stops.slice(0, nextIdx).map((s) => <LineRow key={s.title} s={s} state={s.done ? "past" : "missed"} />)}
          <NowLine label={last ? "NOW · 21:59" : "NOW · 09:40"} />
          <LineRow s={stops[nextIdx]} state="next" eta={last ? "in 1h11" : "in 1h20"} />
          {stops.slice(nextIdx + 1).map((s) => <LineRow key={s.title} s={s} state="later" />)}
          {last && (
            <div className="relative ms-9 me-4 mt-2 rounded-2xl border border-orange-300/40 bg-orange-300/10 p-3">
              <p className="text-[12px] font-bold text-orange-300 flex items-center gap-1"><Airplane size={14} weight="fill" />Leave for ICN by 20:30 · 3 crew · KE 957</p>
              <p className="text-[12px] text-white/70">Then the trip flows into The Wrap.</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  // pre-trip: the same line, zoomed out to days. The present is the line;
  // due items flow toward it as departure nears.
  const dep = m === "T3";
  const rows: { when: string; title: string; icon: typeof MapPin; state: "past" | "next" | "later" }[] = dep
    ? [
        { when: "done", title: "Route · 12 stops over 7 days", icon: MapPin, state: "past" },
        { when: "done", title: "Crew · 4 in", icon: Users, state: "past" },
        { when: "T−3", title: "Pack — 14 left", icon: Package, state: "next" },
        { when: "T−1", title: "Passport scan · add to docs", icon: FileText, state: "later" },
        { when: "Oct 6 09:15", title: "SV 826 · RUH → NRT", icon: Airplane, state: "later" },
      ]
    : [
        { when: "done", title: "Dates · Oct 6–12", icon: CalendarDots, state: "past" },
        { when: "done", title: "Crew · 4 in", icon: Users, state: "past" },
        { when: "open", title: "Vote: Nikko or Hakone?", icon: ChatCircle, state: "next" },
        { when: "T−14", title: "Budget check-in", icon: Wallet, state: "later" },
        { when: "T−7", title: "Docs · passport, hotel", icon: FileText, state: "later" },
        { when: "T−2", title: "Pack", icon: Package, state: "later" },
      ];
  return (
    <div className="h-full relative overflow-hidden">
      <div className={rail} />
      <div className="pt-3">
        <p className="ms-9 me-4 text-[11px] font-bold tracking-wider text-white/40">TOKYO · {dep ? "IN 3 DAYS" : "IN 49 DAYS"}</p>
        {rows.filter((r) => r.state === "past").map((r) => (
          <div key={r.title} className="relative ms-9 me-4 flex items-center gap-3 py-2 opacity-40">
            <span className="absolute -start-9 w-2.5 h-2.5 rounded-full bg-white/40 ms-[21px]" /><r.icon size={16} /><span className="text-[15px] font-semibold line-through">{r.title}</span><Check size={14} className="ms-auto text-[#7CCF7C]" weight="bold" />
          </div>
        ))}
        <NowLine label={dep ? "NOW · T−3" : "NOW · T−49"} />
        {rows.filter((r) => r.state === "next").map((r) => (
          <div key={r.title} className="relative ms-9 me-4 rounded-2xl bg-[#1a1a1c] border border-[#8B7CFF]/50 p-4">
            <span className="absolute -start-9 top-4 w-4 h-4 rounded-full bg-[#8B7CFF] ring-4 ring-[#8B7CFF]/25 -translate-x-1/2 ms-[18px]" />
            <p className="text-[11px] font-bold tracking-wider text-[#8B7CFF]">{dep ? "DUE NOW" : "OPEN"}</p>
            <p className="text-[20px] font-bold mt-0.5 leading-tight">{r.title}</p>
            <button className="mt-3 h-12 w-full rounded-xl bg-[#8B7CFF] text-black font-bold text-sm">{dep ? "Open packing" : "Cast your vote"}</button>
          </div>
        ))}
        {rows.filter((r) => r.state === "later").map((r) => (
          <div key={r.title} className="relative ms-9 me-4 flex items-center gap-3 py-2.5">
            <span className="absolute -start-9 w-2.5 h-2.5 rounded-full border border-white/40 ms-[21px]" /><span className="w-16 text-[13px] text-white/50">{r.when}</span><r.icon size={16} className="text-white/60" /><span className="text-[15px] font-semibold">{r.title}</span>
          </div>
        ))}
        {!dep && (
          <div className="ms-9 me-4 mt-3 rounded-2xl border border-white/10 p-3 flex items-center gap-2 text-[13px] text-white/70"><Sparkle size={16} className="text-[#8B7CFF]" />Nothing else due · heart places in Discover and they&apos;ll land on the line.</div>
        )}
      </div>
    </div>
  );
}


// ─── D · Horizon system across all six moments ───────────────────────────────
function Stub({ hue, kicker, title, sub, icon: I }: { hue: keyof typeof HUE; kicker: string; title: string; sub: string; icon: typeof MapPin }) {
  return <Cta icon={I} label={title} support={sub} urgency={kicker} hue={hue} style="ticket" />;
}
function Footer({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex -space-x-2">{["M", "R", "S", "A"].map((x, i) => <span key={x} className="w-7 h-7 rounded-full ring-2 ring-[#0d0d0d] flex items-center justify-center text-[11px] font-bold" style={{ background: ["#3EC5B7", "#FF8A5C", "#E0B252", "#8B7CFF"][i], color: "#111" }}>{x}</span>)}</div>
      <p className="text-[13px] text-white/60">{text}</p>
    </div>
  );
}
function VariantD({ m }: { m: MomentKey }) {
  if (m === "EMPTY") return (
    <div className="h-full overflow-hidden">
      <Hero eyebrow="IN 21 DAYS" name="Kyoto" sub="Kyoto, Japan · 7 Sep – 13 Sep 2026" />
      <div className="px-4 pt-4 space-y-3">
        <Stub hue="brand" kicker="First stop" title="Where do you want to go?" sub="Add one place · we'll draft the rest" icon={MapPin} />
        {/* the horizon exists from day one: it just has nothing on it yet */}
        <HorizonStrip nowLabel="T−21" progress={30} marks={[{ at: 62, label: "budget" }, { at: 78, label: "docs" }, { at: 92, label: "pack" }]} />
        <div className="flex gap-2.5 overflow-hidden -me-4 pt-1">
          <Postcard img={pic("kyoto-fushimi")} kicker="Crews like yours start with" title="Fushimi Inari" lines={["★ 4.7 · 40k reviews · dawn is quiet"]} />
          <Postcard img={pic("kyoto-now")} kicker="Kyoto right now" title="31° · humid · 18:40 sunset" lines={["¥ 156 = $1 · 6h ahead"]} />
          <Postcard img={pic("crew-invite")} kicker="Just you so far" title="Invite your crew" lines={["one link · no account needed"]} tint="linear-gradient(180deg, rgba(139,124,255,.25), rgba(0,0,0,.85))" />
        </div>
        <p className="text-[13px] text-white/50">Nothing else due · 21 days out</p>
      </div>
    </div>
  );
  if (m === "T49" || m === "T3") return <VariantB m={m} cta="ticket" below="horizon" />;
  if (m === "RECAP") return (
    <div className="h-full overflow-hidden">
      <Hero eyebrow="HOME · 2 DAYS AGO" name="Seoul" sub="7 days · 9 stops · 4 crew" />
      <div className="px-4 pt-4 space-y-3">
        <Stub hue="dune" kicker="Settle up" title="You owe Rania USD 42" sub="2 splits open · everyone else is square" icon={Wallet} />
        {/* the horizon flips: it's the whole trip now, and the dots are memories */}
        <HorizonStrip nowLabel="" progress={100} marks={[{ at: 6, label: "ICN" }, { at: 30, label: "day 2" }, { at: 55, label: "day 4" }, { at: 82, label: "sunset" }, { at: 96, label: "home" }]} />
        <div className="flex gap-2.5 overflow-hidden -me-4 pt-1">
          <Postcard img={pic("seoul-han")} kicker="Most hearted" title="Sunset at Han River" lines={["4 of 4 marked it · 12 photos"]} wide />
          <Postcard img={pic("seoul-market")} kicker="Rania's photo" title="Gwangjang Market" lines={["day 2 · 19:40"]} />
        </div>
        <Footer text="USD 1,120 spent · 280 each · Share the Wrap →" />
      </div>
    </div>
  );
  // LIVE — the map stays; the sheet's peek IS the ticket, teal (wayfind)
  const last = m === "LIVE_LAST";
  const stops = last ? LAST : DAY2;
  const next = stops.find((x) => !x.done && !x.missed)!;
  const idx = stops.indexOf(next);
  return (
    <div className="h-full">
      <MapBg />
      <Sheet height="auto" label="peek = ticket + horizon">
        <Stub hue={last ? "horizon" : "wayfind"} kicker={last ? "Departure tonight · leave by 20:30" : `Up next · ${next.time} · in 1h20`} title={next.title} sub={next.place} icon={last ? Airplane : NavigationArrow} />
        {/* today as a horizon: stops are the dots, now is the orange one */}
        <HorizonStrip nowLabel={last ? "21:59" : "09:40"} progress={last ? 88 : 22} marks={stops.map((x, i) => ({ at: 8 + i * 28, label: x.time, hot: i === idx }))} />
        <div className="flex gap-2.5 overflow-hidden -me-4 pt-1">
          {last ? (
            <>
              <Postcard img={pic("icn-airport")} kicker="Getting to ICN" title="AREX from Hongik · 52 min" lines={["last comfortable train 20:20"]} wide />
              <Postcard img={pic("seoul-han")} kicker="Skipped today" title="Han River sunset" lines={["mark done · or let it go"]} />
            </>
          ) : (
            <>
              <Postcard img={pic("gyeongbok")} kicker="Nearby · open now" title="Tosokchon Samgyetang" lines={["4 min walk · ★ 4.5 · crew ♥ 2"]} />
              <Postcard img={pic("crew-live")} kicker="Crew" title="Sami is at Bukchon" lines={["arrived 09:20 · 12 min from you"]} />
              <Postcard img={pic("seoul-weather")} kicker="Today" title="29° · rain from 15:00" lines={["Bukchon before, market after"]} />
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}


// ─── E · Horizon v2: a beautiful line, cards with a purpose, vertical ────────
function Horizon2({ title, nowLabel, progress, marks, endIcon: End = Airplane }: {
  title: string; nowLabel: string; progress: number;
  marks: { at: number; label: string; icon: typeof MapPin; state?: "done" | "due" | "later" | "now" }[]; endIcon?: typeof MapPin;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent px-4 pt-3 pb-4">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] font-black tracking-[0.18em] uppercase text-white/45">{title}</p>
        <span className="text-[10px] font-bold text-orange-300">● {nowLabel}</span>
      </div>
      <div className="relative h-14 mx-2">
        {/* track */}
        <div className="absolute inset-x-0 top-[22px] h-1.5 rounded-full bg-white/[0.08]" />
        <div className="absolute top-[22px] h-1.5 rounded-full" style={{ left: 0, width: `${progress}%`, background: "linear-gradient(90deg, #6fbf6f 0%, #9BC97E 60%, #E0B252 100%)", boxShadow: "0 0 14px rgba(155,201,126,.35)" }} />
        {/* now */}
        <div className="absolute top-[13px] -translate-x-1/2 z-10" style={{ left: `${progress}%` }}>
          <div className="relative w-6 h-6 rounded-full bg-orange-300 ring-[6px] ring-orange-300/20 shadow-[0_0_20px_rgba(255,180,120,.6)]">
            <span className="absolute inset-0 rounded-full animate-ping bg-orange-300/40" />
          </div>
        </div>
        {/* marks */}
        {marks.map((m) => {
          const I = m.icon;
          const col = m.state === "done" ? "#9BC97E" : m.state === "due" ? "#FF8A5C" : m.state === "now" ? "#FFB478" : "rgba(255,255,255,.35)";
          return (
            <div key={m.label} className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${m.at}%`, top: 0 }}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center border ${m.state === "due" ? "bg-orange-300/15 border-orange-300/60" : m.state === "done" ? "bg-[#9BC97E]/15 border-[#9BC97E]/50" : "bg-[#141416] border-white/15"}`}><I size={13} style={{ color: col }} weight={m.state === "done" ? "fill" : "regular"} /></span>
              <span className="mt-[9px] w-1.5 h-1.5 rounded-full" style={{ background: col }} />
              <span className="mt-1 text-[10px] whitespace-nowrap font-semibold" style={{ color: col }}>{m.label}</span>
            </div>
          );
        })}
        {/* end */}
        <div className="absolute -end-2 top-[10px] w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"><End size={14} weight="fill" className="text-white/80" /></div>
      </div>
    </div>
  );
}
type P2 = { img: string; purpose: string; kicker: string; title: string; body: string; action: string; hue?: keyof typeof HUE; tall?: boolean; tint?: string; icon?: typeof MapPin };
function Postcard2({ p }: { p: P2 }) {
  const col = HUE[p.hue ?? "brand"];
  const I = p.icon ?? MapPin;
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/10 ${p.tall ? "h-[260px]" : "h-[200px]"}`} style={{ backgroundImage: `url(${p.img})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0" style={{ background: p.tint ?? "linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.85) 100%)" }} />
      {/* purpose tag: WHY this card is here */}
      <span className="absolute top-3 start-3 rounded-full bg-black/45 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white/85 flex items-center gap-1"><I size={12} style={{ color: col }} weight="fill" />{p.purpose}</span>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-[10px] font-black tracking-wider uppercase" style={{ color: col }}>{p.kicker}</p>
        <p className="text-[19px] font-bold leading-tight mt-0.5">{p.title}</p>
        <p className="text-[13px] text-white/75 mt-0.5">{p.body}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full px-3.5 h-9 flex items-center text-[13px] font-bold text-black" style={{ background: col }}>{p.action}</span>
          <span className="rounded-full h-9 w-9 flex items-center justify-center border border-white/20 text-white/70">···</span>
        </div>
      </div>
    </div>
  );
}

// One photo, then quiet: the deck's hero keeps its image, the rest are notes.
function NoteCard({ p }: { p: P2 }) {
  const col = HUE[p.hue ?? "brand"];
  const I = p.icon ?? MapPin;
  return (
    <div className="rounded-3xl border border-white/10 bg-[#161618] p-4 flex gap-3.5">
      <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${col}22` }}><I size={20} weight="fill" style={{ color: col }} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-white/45">{p.purpose}</p>
        <p className="text-[16px] font-bold leading-tight mt-0.5">{p.title}</p>
        <p className="text-[13px] text-white/60 mt-0.5 leading-snug">{p.body}</p>
        <p className="mt-2 text-[13px] font-bold flex items-center gap-1" style={{ color: col }}>{p.action} <CaretRight size={12} weight="bold" /></p>
      </div>
    </div>
  );
}
function Deck({ cards, count }: { cards: P2[]; count?: string }) {
  const [hero, ...rest] = cards;
  return (
    <>
      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-[10px] font-black tracking-[0.18em] uppercase text-white/45">Postcards · {count ?? cards.length}</p>
        <p className="text-[12px] text-white/50">picked for now</p>
      </div>
      <Postcard2 p={{ ...hero, tall: true }} />
      {rest.map((p) => <NoteCard key={p.title} p={p} />)}
    </>
  );
}

function VariantE({ m, quiet = false }: { m: MomentKey; quiet?: boolean }) {
  const HZ = { budget: Wallet, docs: FileText, pack: Package };
  if (m === "T49" || m === "EMPTY") {
    const empty = m === "EMPTY";
    const cards: P2[] = empty ? [
      { img: pic("kyoto-fushimi"), purpose: "To get you started", kicker: "Crews like yours start with", title: "Fushimi Inari at dawn", body: "★ 4.7 · the torii before the crowds · 20 min from Kyoto station", action: "Add as first stop", hue: "brand", tall: true, icon: Sparkle },
      { img: pic("kyoto-now"), purpose: "So it feels real", kicker: "Kyoto right now", title: "31° · humid · sunset 18:40", body: "¥156 = $1 · 6h ahead of you", action: "Weather week", hue: "wayfind", icon: Sun },
      { img: pic("crew-invite"), purpose: "Trips are better together", kicker: "Just you so far", title: "Invite your crew", body: "One link · no account needed · they can vote from day one", action: "Share link", hue: "horizon", icon: Users, tint: "linear-gradient(180deg, rgba(139,124,255,.35), rgba(0,0,0,.85))" },
    ] : [
      { img: pic("teamlab-planets"), purpose: "Your crew is deciding", kicker: "Rania hearted · 2h ago", title: "TeamLab Planets", body: "Not on the plan yet · fits Wed 7 afternoon · 2 crew ♥", action: "Add to Wed 7", hue: "horizon", tall: true, icon: Users },
      { img: pic("tokyo-day1"), purpose: "So you can picture it", kicker: "Your day 1 · Oct 6", title: "Shibuya crossing → ramen", body: "Lands 15:00 · hotel 15:30 · 3 stops · light rain likely", action: "Open day 1", hue: "brand", icon: CalendarDots },
      { img: pic("tokyo-shibuya"), purpose: "So you know what to expect", kicker: "Tokyo right now", title: "27° · clear · sunset 18:03", body: "¥156 = $1 · 6h ahead · typhoon season ends mid-Oct", action: "Weather week", hue: "wayfind", icon: Sun },
      { img: pic("tokyo-money"), purpose: "So no one is surprised", kicker: "Money", title: "USD 8,000 · 2,000 each", body: "Nothing spent yet · Sami's flight isn't logged", action: "Log a booking", hue: "dune", icon: Wallet, tint: "linear-gradient(180deg, rgba(224,178,82,.25), rgba(0,0,0,.85))" },
    ];
    return (
      <div className="h-full overflow-y-auto pb-28">
        <Hero eyebrow={empty ? "IN 21 DAYS" : "IN 49 DAYS"} name={empty ? "Kyoto" : "Tokyo"} sub={empty ? "Kyoto, Japan · 7 Sep – 13 Sep 2026" : "Tokyo, Japan · 6 Oct – 12 Oct 2026"} />
        <div className="px-4 pt-4 space-y-3">
          {empty
            ? <Stub hue="brand" kicker="First stop" title="Where do you want to go?" sub="Add one place · we'll draft the rest" icon={MapPin} />
            : <Stub hue="horizon" kicker="Your vote's missing" title="Nikko or Hakone?" sub="Crew vote · 2 of 4 voted · closes tonight" icon={ChatCircle} />}
          <Horizon2 title={empty ? "Horizon · 21 days to Kyoto" : "Horizon · 49 days to Tokyo"} nowLabel={empty ? "T−21" : "T−49"} progress={empty ? 30 : 18}
            marks={[{ at: 60, label: "budget", icon: HZ.budget, state: "later" }, { at: 76, label: "docs", icon: HZ.docs, state: "later" }, { at: 91, label: "pack", icon: HZ.pack, state: "later" }]} />
          {quiet ? <Deck cards={cards} /> : (<>
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-[10px] font-black tracking-[0.18em] uppercase text-white/45">Postcards · {cards.length}</p>
            <p className="text-[12px] text-white/50">picked for now</p>
          </div>
          {cards.map((p) => <Postcard2 key={p.title} p={p} />)}
          </>)}
          <Footer text={empty ? "Just you · 0 stops · Invite crew →" : "4 going · 12 stops · USD 8,000 · Discover →"} />
        </div>
      </div>
    );
  }
  if (m === "T3") {
    const cards: P2[] = [
      { img: pic("boarding-pass"), purpose: "The thing you'll need first", kicker: "Oct 6 · 09:15 · SV 826", title: "RUH → NRT · gate opens 08:15", body: "4 crew on it · 3 have checked in · you haven't", action: "Check in", hue: "horizon", tall: true, icon: Ticket, tint: "linear-gradient(180deg, rgba(20,20,40,.4), rgba(0,0,0,.88))" },
      { img: pic("tokyo-shibuya"), purpose: "So you pack right", kicker: "Tokyo on Oct 6", title: "24° · light rain · 18:00 sunset", body: "Pack a shell · umbrella ✔ · no jacket needed", action: "Fix my packing", hue: "dune", icon: Sun },
      { img: pic("shinjuku-hotel"), purpose: "So arrival is calm", kicker: "Night 1", title: "Shinjuku Granbell", body: "Check-in 15:00 · 2 rooms · 4 min from Shinjuku Sta.", action: "Open booking", hue: "brand", icon: Bed },
      { img: pic("passport"), purpose: "So border control is 30 s", kicker: "Docs · 1 of 2", title: "Passport scan missing", body: "Add before T−1 · Sami's is in", action: "Add scan", hue: "horizon", icon: FileText, tint: "linear-gradient(180deg, rgba(255,138,92,.25), rgba(0,0,0,.88))" },
    ];
    return (
      <div className="h-full overflow-y-auto pb-28">
        <Hero eyebrow="IN 3 DAYS" name="Tokyo" sub="Tokyo, Japan · 6 Oct – 12 Oct 2026" />
        <div className="px-4 pt-4 space-y-3">
          <Stub hue="dune" kicker="Due now" title="Pack — 14 left" sub="18 items · flight in 3 days" icon={Package} />
          <Horizon2 title="Horizon · 3 days to Tokyo" nowLabel="T−3" progress={88}
            marks={[{ at: 60, label: "budget", icon: HZ.budget, state: "done" }, { at: 76, label: "docs 1/2", icon: HZ.docs, state: "due" }, { at: 91, label: "pack", icon: HZ.pack, state: "due" }]} />
          {quiet ? <Deck cards={cards} /> : (<>
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-[10px] font-black tracking-[0.18em] uppercase text-white/45">Postcards · {cards.length}</p>
            <p className="text-[12px] text-white/50">picked for now</p>
          </div>
          {cards.map((p) => <Postcard2 key={p.title} p={p} />)}
          </>)}
          <Footer text="4 going · 12 stops · USD 8,000 · Discover →" />
        </div>
      </div>
    );
  }
  if (m === "RECAP") {
    const cards: P2[] = [
      { img: pic("seoul-han"), purpose: "The one everyone loved", kicker: "Most hearted · 4 of 4", title: "Sunset at Han River", body: "12 photos · Rania's is the crew favourite", action: "Open the Wrap", hue: "brand", tall: true, icon: Camera },
      { img: pic("seoul-market"), purpose: "Rania's memory", kicker: "Day 2 · 19:40", title: "Gwangjang Market", body: "Photo from Rania · 3 reactions", action: "React", hue: "horizon", icon: Camera },
      { img: pic("seoul-money"), purpose: "So it ends clean", kicker: "Money", title: "USD 1,120 · 280 each", body: "2 splits open · everyone else is square", action: "Settle up", hue: "dune", icon: Wallet, tint: "linear-gradient(180deg, rgba(224,178,82,.25), rgba(0,0,0,.85))" },
    ];
    return (
      <div className="h-full overflow-y-auto pb-28">
        <Hero eyebrow="HOME · 2 DAYS AGO" name="Seoul" sub="7 days · 9 stops · 4 crew" />
        <div className="px-4 pt-4 space-y-3">
          <Stub hue="dune" kicker="Settle up" title="You owe Rania USD 42" sub="2 splits open · everyone else is square" icon={Wallet} />
          <Horizon2 title="Horizon · the whole trip" nowLabel="home" progress={100} endIcon={Camera}
            marks={[{ at: 6, label: "ICN", icon: Airplane, state: "done" }, { at: 30, label: "day 2", icon: ForkKnife, state: "done" }, { at: 55, label: "day 4", icon: Camera, state: "done" }, { at: 80, label: "sunset", icon: Sun, state: "done" }]} />
          {quiet ? <Deck cards={cards} /> : (<>
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-[10px] font-black tracking-[0.18em] uppercase text-white/45">Postcards · {cards.length}</p>
            <p className="text-[12px] text-white/50">picked for now</p>
          </div>
          {cards.map((p) => <Postcard2 key={p.title} p={p} />)}
          </>)}
          <Footer text="USD 1,120 spent · Share the Wrap →" />
        </div>
      </div>
    );
  }
  // LIVE: map on top, sheet at ~62%, everything below scrolls inside the sheet
  const last = m === "LIVE_LAST";
  const stops = last ? LAST : DAY2;
  const next = stops.find((x) => !x.done && !x.missed)!;
  const idx = stops.indexOf(next);
  const cards: P2[] = last ? [
    { img: pic("icn-airport"), purpose: "So you make the flight", kicker: "Getting to ICN", title: "AREX from Hongik · 52 min", body: "Last comfortable train 20:20 · 3 crew going with you", action: "Navigate", hue: "wayfind", tall: true, icon: NavigationArrow },
    { img: pic("seoul-han"), purpose: "Skipped today", kicker: "18:00 · unmarked", title: "Han River sunset", body: "Mark it done or let it go — the recap waits for the flight", action: "Mark done", hue: "dune", icon: Sun },
  ] : [
    { img: pic("gyeongbok"), purpose: "Nearby · open now", kicker: "4 min walk · ★ 4.5", title: "Tosokchon Samgyetang", body: "Crew ♥ 2 · closes 22:00 · fits before the palace", action: "Add before 11:00", hue: "horizon", tall: true, icon: ForkKnife },
    { img: pic("crew-live"), purpose: "Your crew, right now", kicker: "Sami · arrived 09:20", title: "At Bukchon already", body: "12 min from you · Rania & Ali still at breakfast", action: "Ping crew", hue: "brand", icon: Users },
    { img: pic("seoul-weather"), purpose: "So the day works", kicker: "Today", title: "29° · rain from 15:00", body: "Bukchon before, market after — swap them?", action: "Swap 14:00 ↔ 19:30", hue: "wayfind", icon: Sun },
  ];
  return (
    <div className="h-full">
      <MapBg />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-[#141416] border-t border-white/10 px-4 pt-2 overflow-y-auto" style={{ height: "66%", paddingBottom: 96 }}>
        <div className="mx-auto w-9 h-1 rounded-full bg-white/25 mb-3" />
        <div className="space-y-3">
          <Stub hue={last ? "horizon" : "wayfind"} kicker={last ? "Departure tonight · leave by 20:30" : `Up next · ${next.time} · in 1h20`} title={next.title} sub={next.place} icon={last ? Airplane : NavigationArrow} />
          <Horizon2 title={last ? "Today · final day" : "Today · day 2"} nowLabel={last ? "21:59" : "09:40"} progress={last ? 88 : 22} endIcon={last ? Airplane : Moon}
            marks={stops.map((x, i) => ({ at: 6 + i * 27, label: x.time, icon: x.icon, state: x.done ? "done" : x.missed ? "due" : i === idx ? "now" : "later" }))} />
          {quiet ? <Deck cards={cards} /> : cards.map((p) => <Postcard2 key={p.title} p={p} />)}
        </div>
      </div>
    </div>
  );
}


// ─── G · smaller: compact notes with hidden detail; LIVE shows the schedule ──
function NoteRow({ p, open = false }: { p: P2; open?: boolean }) {
  const col = HUE[p.hue ?? "brand"];
  const I = p.icon ?? MapPin;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#161618] px-3.5 py-3">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${col}22` }}><I size={17} weight="fill" style={{ color: col }} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight truncate">{p.title}</p>
          <p className="text-[12px] text-white/50 truncate">{open ? p.purpose : p.body}</p>
        </div>
        <span className="text-[12px] font-bold shrink-0 flex items-center gap-0.5" style={{ color: col }}>{p.action.split(" ")[0]} <CaretRight size={11} weight="bold" /></span>
      </div>
      {open && <p className="text-[13px] text-white/65 mt-2 ps-12">{p.body}</p>}
    </div>
  );
}
function HeroCard({ p }: { p: P2 }) {
  const col = HUE[p.hue ?? "brand"];
  const I = p.icon ?? MapPin;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 h-[176px]" style={{ backgroundImage: `url(${p.img})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0" style={{ background: p.tint ?? "linear-gradient(180deg, rgba(0,0,0,.1) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.85) 100%)" }} />
      <span className="absolute top-3 start-3 rounded-full bg-black/45 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white/85 flex items-center gap-1"><I size={12} style={{ color: col }} weight="fill" />{p.purpose}</span>
      <div className="absolute inset-x-0 bottom-0 p-3.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-wider uppercase" style={{ color: col }}>{p.kicker}</p>
          <p className="text-[18px] font-bold leading-tight truncate">{p.title}</p>
          <p className="text-[12px] text-white/70 truncate">{p.body}</p>
        </div>
        <span className="shrink-0 rounded-full px-3.5 h-9 flex items-center text-[13px] font-bold text-black" style={{ background: col }}>{p.action}</span>
      </div>
    </div>
  );
}
function ScheduleRow({ s, state, now }: { s: Stop; state: "done" | "missed" | "next" | "later"; now?: string }) {
  const I = s.icon;
  const dim = state === "done";
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl ${state === "next" ? "bg-[#3EC5B7]/10 border border-[#3EC5B7]/40" : "border border-transparent"} ${dim ? "opacity-45" : ""}`}>
      <span className="w-11 text-[13px] tabular-nums font-semibold text-white/60">{s.time}</span>
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${state === "next" ? "bg-[#3EC5B7]/20" : "bg-white/[0.06]"}`}><I size={15} className={state === "next" ? "text-[#3EC5B7]" : "text-white/70"} /></span>
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-bold leading-tight truncate ${dim ? "line-through" : ""}`}>{s.title}</p>
        <p className="text-[12px] text-white/50 truncate">{state === "next" && now ? now : s.place}</p>
      </div>
      {state === "done" && <Check size={16} weight="bold" className="text-[#9BC97E]" />}
      {state === "missed" && <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold text-white/60">Done?</span>}
      {state === "next" && <span className="rounded-full bg-[#3EC5B7] text-black px-2.5 py-1 text-[11px] font-black">GO</span>}
      {state === "later" && <span className="text-[11px] text-white/35">{s.place.split(" ")[0]}</span>}
    </div>
  );
}
function VariantG({ m }: { m: MomentKey }) {
  const HZ = { budget: Wallet, docs: FileText, pack: Package };
  if (m === "T49" || m === "T3" || m === "EMPTY" || m === "RECAP") {
    const t3 = m === "T3", empty = m === "EMPTY", recap = m === "RECAP";
    const cards: P2[] = recap ? [
      { img: pic("seoul-han"), purpose: "The one everyone loved", kicker: "Most hearted · 4 of 4", title: "Sunset at Han River", body: "12 photos", action: "Open Wrap", hue: "brand", icon: Camera },
      { img: "", purpose: "So it ends clean", kicker: "Money", title: "USD 1,120 · 280 each", body: "2 splits open", action: "Settle", hue: "dune", icon: Wallet },
      { img: "", purpose: "Rania's memory", kicker: "Day 2", title: "Gwangjang Market photo", body: "3 reactions", action: "React", hue: "horizon", icon: Camera },
    ] : empty ? [
      { img: pic("kyoto-fushimi"), purpose: "To get you started", kicker: "Crews like yours start with", title: "Fushimi Inari", body: "★ 4.7 · dawn is quiet", action: "Add", hue: "brand", icon: Sparkle },
      { img: "", purpose: "So it feels real", kicker: "", title: "Kyoto · 31° · humid", body: "¥156 = $1 · 6h ahead", action: "Weather", hue: "wayfind", icon: Sun },
      { img: "", purpose: "Trips are better together", kicker: "", title: "Invite your crew", body: "one link · no account", action: "Share", hue: "horizon", icon: Users },
    ] : t3 ? [
      { img: pic("boarding-pass"), purpose: "The thing you'll need first", kicker: "Oct 6 · 09:15 · SV 826", title: "RUH → NRT", body: "gate 08:15 · 3 of 4 checked in", action: "Check in", hue: "horizon", icon: Ticket, tint: "linear-gradient(180deg, rgba(20,20,40,.4), rgba(0,0,0,.88))" },
      { img: "", purpose: "So you pack right", kicker: "", title: "Tokyo · 24° · light rain", body: "pack a shell", action: "Fix packing", hue: "dune", icon: Sun },
      { img: "", purpose: "So arrival is calm", kicker: "", title: "Shinjuku Granbell", body: "check-in 15:00 · 4 min from station", action: "Open", hue: "brand", icon: Bed },
      { img: "", purpose: "So border control is 30 s", kicker: "", title: "Passport scan missing", body: "add before T−1", action: "Add", hue: "horizon", icon: FileText },
    ] : [
      { img: pic("teamlab-planets"), purpose: "Your crew is deciding", kicker: "Rania hearted · 2h", title: "TeamLab Planets", body: "fits Wed 7 · 2 crew ♥", action: "Add", hue: "horizon", icon: Users },
      { img: "", purpose: "So you can picture it", kicker: "", title: "Day 1 · Shibuya → ramen", body: "lands 15:00 · 3 stops", action: "Open", hue: "brand", icon: CalendarDots },
      { img: "", purpose: "So you know what to expect", kicker: "", title: "Tokyo · 27° · clear", body: "¥156 = $1 · 6h ahead", action: "Weather", hue: "wayfind", icon: Sun },
      { img: "", purpose: "So no one is surprised", kicker: "", title: "USD 8,000 · 2,000 each", body: "Sami's flight isn't logged", action: "Log", hue: "dune", icon: Wallet },
    ];
    const [hero, ...notes] = cards;
    return (
      <div className="h-full overflow-y-auto pb-28">
        <Hero eyebrow={recap ? "HOME · 2 DAYS AGO" : empty ? "IN 21 DAYS" : t3 ? "IN 3 DAYS" : "IN 49 DAYS"} name={recap ? "Seoul" : empty ? "Kyoto" : "Tokyo"} sub={recap ? "7 days · 9 stops · 4 crew" : empty ? "Kyoto, Japan · 7 Sep – 13 Sep 2026" : "Tokyo, Japan · 6 Oct – 12 Oct 2026"} />
        <div className="px-4 pt-4 space-y-3">
          {recap ? <Stub hue="dune" kicker="Settle up" title="You owe Rania USD 42" sub="2 splits open · everyone else is square" icon={Wallet} />
            : empty ? <Stub hue="brand" kicker="First stop" title="Where do you want to go?" sub="Add one place · we'll draft the rest" icon={MapPin} />
            : t3 ? <Stub hue="dune" kicker="Due now" title="Pack — 14 left" sub="18 items · flight in 3 days" icon={Package} />
            : <Stub hue="horizon" kicker="Your vote's missing" title="Nikko or Hakone?" sub="Crew vote · 2 of 4 voted · closes tonight" icon={ChatCircle} />}
          {recap
            ? <Horizon2 title="Horizon · the whole trip" nowLabel="home" progress={100} endIcon={Camera} marks={[{ at: 6, label: "ICN", icon: Airplane, state: "done" }, { at: 30, label: "day 2", icon: ForkKnife, state: "done" }, { at: 55, label: "day 4", icon: Camera, state: "done" }, { at: 80, label: "sunset", icon: Sun, state: "done" }]} />
            : <Horizon2 title={empty ? "Horizon · 21 days to Kyoto" : t3 ? "Horizon · 3 days to Tokyo" : "Horizon · 49 days to Tokyo"} nowLabel={empty ? "T−21" : t3 ? "T−3" : "T−49"} progress={empty ? 30 : t3 ? 88 : 18}
                marks={[{ at: 60, label: "budget", icon: HZ.budget, state: t3 ? "done" : "later" }, { at: 76, label: t3 ? "docs 1/2" : "docs", icon: HZ.docs, state: t3 ? "due" : "later" }, { at: 91, label: "pack", icon: HZ.pack, state: t3 ? "due" : "later" }]} />}
          <HeroCard p={hero} />
          <div className="space-y-2">
            {notes.map((p) => <NoteRow key={p.title} p={p} />)}
          </div>
          <Footer text={recap ? "USD 1,120 · Share the Wrap →" : empty ? "Just you · 0 stops" : "4 going · 12 stops · USD 8,000"} />
        </div>
      </div>
    );
  }
  // LIVE: ticket + today line + THE SCHEDULE. One quiet context line, no cards.
  const last = m === "LIVE_LAST";
  const stops = last ? LAST : DAY2;
  const next = stops.find((x) => !x.done && !x.missed)!;
  const idx = stops.indexOf(next);
  return (
    <div className="h-full">
      <MapBg />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-[#141416] border-t border-white/10 px-4 pt-2 overflow-y-auto" style={{ height: "62%", paddingBottom: 96 }}>
        <div className="mx-auto w-9 h-1 rounded-full bg-white/25 mb-3" />
        <div className="space-y-3">
          <Stub hue={last ? "horizon" : "wayfind"} kicker={last ? "Departure tonight · leave by 20:30" : `Up next · ${next.time} · in 1h20`} title={next.title} sub={next.place} icon={last ? Airplane : NavigationArrow} />
          <Horizon2 title={last ? "Today · final day" : "Today · day 2"} nowLabel={last ? "21:59" : "09:40"} progress={last ? 88 : 22} endIcon={last ? Airplane : Moon}
            marks={stops.map((x, i) => ({ at: 6 + i * 27, label: x.time, icon: x.icon, state: x.done ? "done" : x.missed ? "due" : i === idx ? "now" : "later" }))} />
          {/* one context line — the only "card" that survives in LIVE */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px]">
            <Sun size={16} className="text-[#3EC5B7] shrink-0" weight="fill" />
            <span className="flex-1 truncate">{last ? "AREX from Hongik 52 min · last comfortable train 20:20" : "29° · rain from 15:00 — swap Bukchon and the market?"}</span>
            <span className="text-[#3EC5B7] font-bold shrink-0">{last ? "Route" : "Swap"}</span>
          </div>
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <p className="text-[10px] font-black tracking-[0.18em] uppercase text-white/45">Schedule · {stops.length} stops</p>
              <p className="text-[12px] text-white/50">{stops.filter((x) => x.done).length} done</p>
            </div>
            <div className="space-y-1">
              {stops.map((x, i) => <ScheduleRow key={x.title} s={x} state={x.done ? "done" : x.missed ? "missed" : i === idx ? "next" : "later"} now={last ? "in 1h11 · gate 246" : "in 1h20 · 12 min walk"} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── H · "Add a confirmation" — how flights/hotels get into the app ─────────
function ConfirmSheet({ step }: { step: "pick" | "preview" }) {
  return (
    <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-[#141416] border-t border-white/10 px-4 pt-2" style={{ paddingBottom: 100 }}>
      <div className="mx-auto w-9 h-1 rounded-full bg-white/25 mb-3" />
      <p className="text-[18px] font-bold">Add a confirmation</p>
      <p className="text-[13px] text-white/55 mb-4">Flight, hotel, train, ticket — it lands on the plan, the horizon and your docs.</p>
      {step === "pick" ? (
        <div className="space-y-2.5">
          {[
            [Camera, "Snap it", "Photo or screenshot of the email · we read it", "horizon"],
            [FileText, "Paste it", "Email text or the booking link", "brand"],
            [Ticket, "Type it", "Flight no. or hotel name · 20 seconds", "wayfind"],
          ].map(([I, t, sub, hue]) => { const Ic = I as typeof MapPin; const col = HUE[hue as keyof typeof HUE]; return (
            <div key={t as string} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1c] px-4 py-3.5">
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${col}22` }}><Ic size={20} weight="fill" style={{ color: col }} /></span>
              <div className="flex-1"><p className="text-[15px] font-bold">{t as string}</p><p className="text-[12px] text-white/55">{sub as string}</p></div>
              <CaretRight size={16} className="text-white/40" />
            </div>
          ); })}
          <p className="text-[12px] text-white/40 pt-1">Or forward the email to <span className="text-white/70 font-semibold">trip-4f2a@in.paxawa.com</span> — same result.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#3EC5B7]/40 bg-[#3EC5B7]/10 px-3.5 py-2.5 text-[12px] flex items-center gap-2"><Check size={14} weight="bold" className="text-[#3EC5B7]" /><span>Read from your screenshot · <b>2 things found</b> · check them once</span></div>
          <div className="rounded-3xl overflow-hidden border border-white/10">
            <div className="p-4" style={{ background: "linear-gradient(135deg,#FF8A5C,#ff9d78)", color: "#111" }}>
              <div className="flex items-center justify-between text-[10px] font-black tracking-[0.2em] uppercase opacity-70"><span>Flight</span><span>SV 826</span></div>
              <div className="flex items-end justify-between mt-1"><div><p className="text-[28px] font-black leading-none">RUH</p><p className="text-[12px] font-semibold opacity-80">Riyadh · 09:15</p></div><Airplane size={22} weight="fill" /><div className="text-end"><p className="text-[28px] font-black leading-none">NRT</p><p className="text-[12px] font-semibold opacity-80">Tokyo · 06 Oct 15:00</p></div></div>
              <p className="text-[12px] font-semibold mt-2 opacity-80">Conf. <b>7XK9QP</b> · 4 passengers · gate opens 08:15</p>
            </div>
            <div className="p-3.5 bg-[#1a1a1c] flex items-center gap-3"><Bed size={18} className="text-[#8B7CFF]" /><div className="flex-1"><p className="text-[14px] font-bold">Shinjuku Granbell Hotel</p><p className="text-[12px] text-white/55">Oct 6 → 12 · check-in 15:00 · 2 rooms · conf. HB-22910</p></div><span className="text-[12px] text-white/40">edit</span></div>
          </div>
          <div className="text-[12px] text-white/55 space-y-1">
            <p>→ Day 1: <b className="text-white/80">SV 826</b> pinned 09:15, <b className="text-white/80">Granbell</b> pinned 15:00 (anchors, can&apos;t be dragged)</p>
            <p>→ Horizon: plane at <b className="text-white/80">Oct 6 09:15</b>, hotel on the line</p>
            <p>→ Docs: screenshot saved · <b className="text-white/80">4 crew</b> can open it offline</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="flex-1 h-12 rounded-full bg-[#8B7CFF] text-black font-bold text-[15px]">Add both</button>
            <button className="h-12 px-5 rounded-full border border-white/15 font-bold text-[14px]">Only flight</button>
          </div>
        </div>
      )}
    </div>
  );
}
function VariantH({ step }: { step: "pick" | "preview" }) {
  return (
    <div className="h-full overflow-hidden">
      <div className="opacity-30 pointer-events-none">
        <Hero eyebrow="IN 49 DAYS" name="Tokyo" sub="Tokyo, Japan · 6 Oct – 12 Oct 2026" />
        <div className="px-4 pt-4"><Stub hue="horizon" kicker="Your vote's missing" title="Nikko or Hakone?" sub="Crew vote · 2 of 4 voted" icon={ChatCircle} /></div>
      </div>
      <div className="absolute inset-0 bg-black/50" />
      <ConfirmSheet step={step} />
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function NowLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const [m, setM] = useState<MomentKey>("LIVE_LAST");
  const [ctaLab, setCtaLab] = useState(false);
  const [belowLab, setBelowLab] = useState(false);
  const [dLab, setDLab] = useState(false);
  const [eLab, setELab] = useState(false);
  const [fLab, setFLab] = useState(false);
  const [gLab, setGLab] = useState(false);
  const [hLab, setHLab] = useState(false);
  const mm = MOMENTS.find((x) => x.key === m)!;
  return (
    <div className="min-h-screen bg-[#08080a] text-white p-6">
      <div className="max-w-[1300px] mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="rounded-md bg-amber-400 text-black text-[11px] font-black px-2 py-0.5">DEV PREVIEW</span>
          <h1 className="text-xl font-bold">Now page · three proposals × four moments</h1>
        </div>
        <p className="text-white/50 text-sm mb-4">Mock data. Phase comes from tripPhase() (untouched); what changes is what each proposal does <em>inside</em> a phase.</p>
        <div className="flex flex-wrap gap-2 mb-6" data-moments>
          {MOMENTS.map((x) => (
            <button key={x.key} data-moment={x.key} onClick={() => setM(x.key)} className={`rounded-full px-4 py-2 text-sm font-bold border ${m === x.key ? "bg-white text-black border-white" : "border-white/20 text-white/70"}`}>{x.label}</button>
          ))}
          <span className="self-center text-white/40 text-sm ms-2">{mm.phase} · {mm.sub}</span>
        </div>
        <button data-cta-lab onClick={() => setCtaLab((v) => !v)} className={`mb-4 rounded-full px-4 py-2 text-sm font-bold border ${ctaLab ? "bg-white text-black border-white" : "border-white/20 text-white/70"}`}>CTA lab (B × 3 styles)</button>
        <button data-below-lab onClick={() => setBelowLab((v) => !v)} className={`mb-4 ms-2 rounded-full px-4 py-2 text-sm font-bold border ${belowLab ? "bg-white text-black border-white" : "border-white/20 text-white/70"}`}>Below-CTA lab (B3 × 3 layouts)</button>
        <button data-d-lab onClick={() => setDLab((v) => !v)} className={`mb-4 ms-2 rounded-full px-4 py-2 text-sm font-bold border ${dLab ? "bg-white text-black border-white" : "border-white/20 text-white/70"}`}>D · Horizon system (all moments)</button>
        <button data-e-lab onClick={() => setELab((v) => !v)} className={`mb-4 ms-2 rounded-full px-4 py-2 text-sm font-bold border ${eLab ? "bg-white text-black border-white" : "border-white/20 text-white/70"}`}>E · Horizon v2 (scrolls)</button>
        <button data-f-lab onClick={() => setFLab((v) => !v)} className={`mb-4 ms-2 rounded-full px-4 py-2 text-sm font-bold border ${fLab ? "bg-white text-black border-white" : "border-white/20 text-white/70"}`}>F · one photo, then notes</button>
        <button data-g-lab onClick={() => setGLab((v) => !v)} className={`mb-4 ms-2 rounded-full px-4 py-2 text-sm font-bold border ${gLab ? "bg-white text-black border-white" : "border-white/20 text-white/70"}`}>G · smaller + schedule</button>
        <button data-h-lab onClick={() => setHLab((v) => !v)} className={`mb-4 ms-2 rounded-full px-4 py-2 text-sm font-bold border ${hLab ? "bg-white text-black border-white" : "border-white/20 text-white/70"}`}>H · Add a confirmation</button>
        {hLab ? (
          <div className="flex flex-wrap gap-8 justify-center" data-variants>
            <Phone title="H1 · three ways in"><VariantH step="pick" /></Phone>
            <Phone title="H2 · what we read, where it lands"><VariantH step="preview" /></Phone>
          </div>
        ) : gLab ? (
          <div className="flex flex-wrap gap-8 justify-center" data-variants>
            <Phone title={`G · ${mm.label}`}><VariantG m={m} /></Phone>
          </div>
        ) : fLab ? (
          <div className="flex flex-wrap gap-8 justify-center" data-variants>
            <Phone title={`F · Horizon v3 · ${mm.label}`}><VariantE m={m} quiet /></Phone>
          </div>
        ) : eLab ? (
          <div className="flex flex-wrap gap-8 justify-center" data-variants>
            <Phone title={`E · Horizon v2 · ${mm.label}`}><VariantE m={m} /></Phone>
          </div>
        ) : dLab ? (
          <div className="flex flex-wrap gap-8 justify-center" data-variants>
            <Phone title={`D · Horizon · ${mm.label}`}><VariantD m={m} /></Phone>
          </div>
        ) : belowLab ? (
          <div className="flex flex-wrap gap-8 justify-center" data-variants>
            <Phone title="1 · Fold (two blocks)"><VariantB m={m} cta="ticket" below="fold" /></Phone>
            <Phone title="2 · Strip + crew"><VariantB m={m} cta="ticket" below="strip" /></Phone>
            <Phone title="3 · Line-lite (coming up)"><VariantB m={m} cta="ticket" below="line" /></Phone>
            <Phone title="4 · Horizon + postcards"><VariantB m={m} cta="ticket" below="horizon" /></Phone>
          </div>
        ) : ctaLab ? (
          <div className="flex flex-wrap gap-8 justify-center" data-variants>
            <Phone title="B1 · Hue by action (pill)"><VariantB m={m} cta="hue" /></Phone>
            <Phone title="B2 · Action card"><VariantB m={m} cta="card" /></Phone>
            <Phone title="B3 · Boarding stub"><VariantB m={m} cta="ticket" /></Phone>
          </div>
        ) : (
          <div className="flex flex-wrap gap-8 justify-center" data-variants>
            <Phone title="A · Auditor&apos;s fixes"><VariantA m={m} /></Phone>
            <Phone title="B · One clock (tripMoment)"><VariantB m={m} /></Phone>
            <Phone title="C · The Line"><VariantC m={m} /></Phone>
          </div>
        )}
      </div>
    </div>
  );
}
