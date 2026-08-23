"use client";

/**
 * INSPIRE LAB — design options for "where do imported places live".
 * ?v=a  — Shortlist becomes a first-class Discover mode (For you | Shortlist)
 * ?v=b1 — Import is a JOURNEY: results as a review deck (Save / Skip)
 * ?v=b2 — Journey done screen: the saves have a home and next actions
 * ?v=c  — Ideas tray in the Plan: imports land where planning happens
 * Static mockups on the real design tokens. Not wired.
 */
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Heart, MapPin, Plus, Check, Sparkle, CaretRight, Star, DotsSixVertical, Compass, ArrowRight, TiktokLogo, InstagramLogo } from "@phosphor-icons/react/dist/ssr";

const PHOTOS = {
  tempura: "https://images.unsplash.com/photo-1581781870027-04212e231e96?w=500&q=60",
  ramen: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=500&q=60",
  teamlab: "https://images.unsplash.com/photo-1554797589-7241bb691973?w=500&q=60",
  shrine: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=500&q=60",
  tower: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=500&q=60",
};

const P = [
  { name: "Tempura SHINJUKU-TEI", area: "Ginza", rating: 4.9, img: PHOTOS.tempura, src: "tiktok", by: "@halaljapan" },
  { name: "Toribushi Ramen", area: "Ikebukuro", rating: 4.3, img: PHOTOS.ramen, src: "tiktok", by: "@yusuf_jp" },
  { name: "teamLab Planets", area: "Toyosu", rating: 4.7, img: PHOTOS.teamlab, src: "ig", by: "@tokyo.spots" },
  { name: "Senso-ji Temple", area: "Asakusa", rating: 4.8, img: PHOTOS.shrine, src: "ig", by: "@tokyo.spots" },
  { name: "Shibuya Sky", area: "Shibuya", rating: 4.6, img: PHOTOS.tower, src: "tiktok", by: "@halaljapan" },
];

function SrcChip({ src, by }: { src: string; by: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[11px] font-bold text-white">
      {src === "tiktok" ? <TiktokLogo size={16} weight="fill" /> : <InstagramLogo size={16} weight="fill" />}
      {by}
    </span>
  );
}

function Phone({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="shrink-0">
      <p className="text-center text-sm font-bold mb-2 text-muted-foreground">{label}</p>
      <div className="w-[390px] h-[844px] rounded-[28px] border border-border overflow-hidden relative bg-background text-foreground">
        {children}
      </div>
    </div>
  );
}

function Nav({ active }: { active: string }) {
  const items = [{ k: "now", l: "Now" }, { k: "discover", l: "Discover" }, { k: "money", l: "Money" }];
  return (
    <div className="absolute bottom-0 inset-x-0 h-[84px] flex items-center justify-center gap-2 px-3" style={{ background: "var(--nav-glass)", backdropFilter: "blur(10px)" }}>
      <div className="w-14 h-14 rounded-full border border-border bg-card flex flex-col items-center justify-center shrink-0">
        <span className="text-[12px] font-bold">Plan</span>
      </div>
      <div className="flex-1 max-w-[240px] h-14 rounded-full border border-border flex items-center px-1" style={{ background: "var(--nav-glass)" }}>
        {items.map((i) => (
          <div key={i.k} className="flex-1 h-12 rounded-full flex items-center justify-center" style={active === i.k ? { background: "var(--nav-chip)" } : {}}>
            <span className="text-[12px] font-bold" style={active === i.k ? { color: "var(--clr-brand)" } : {}}>{i.l}</span>
          </div>
        ))}
      </div>
      <div className="w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0 text-white" style={{ background: "var(--clr-brand)" }}>
        <Plus size={20} weight="bold" />
        <span className="text-[11px] font-bold">Add</span>
      </div>
    </div>
  );
}

/* A — Shortlist = a first-class Discover mode */

/* A1 — Discover · For you: the chip entry (exists today, stays) */
function VariantA1() {
  return (
    <>
      <div className="px-4 pt-5">
        <p className="text-[20px] font-extrabold">Discover</p>
        <div className="mt-3 flex p-1 rounded-full bg-secondary border border-border">
          <div className="flex-1 h-11 rounded-full flex items-center justify-center text-[14px] font-bold bg-card border border-border">For you</div>
          <div className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 text-[14px] font-bold text-muted-foreground">
            <Heart size={16} /> Shortlist
            <span className="min-w-5 h-5 px-1 rounded-full text-[11px] font-black flex items-center justify-center text-white" style={{ background: "var(--clr-brand)" }}>5</span>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {/* ENTRY ➊ — the chip, first in the row (already shipped) */}
          <span className="h-10 px-3.5 rounded-full border-2 flex items-center gap-1.5 text-[13px] font-bold shrink-0" style={{ borderColor: "var(--clr-brand)" }}>
            <Sparkle size={16} weight="fill" style={{ color: "var(--clr-brand)" }} /> Import from a link
          </span>
          {["All", "Food", "Sights", "Stay"].map((c, i) => (
            <span key={c} className={`h-10 px-3.5 rounded-full flex items-center text-[13px] font-bold shrink-0 ${i === 0 ? "bg-card border border-border" : "text-muted-foreground border border-border/50"}`}>{c}</span>
          ))}
        </div>
      </div>
      <div className="px-4 mt-4 grid grid-cols-2 gap-2.5">
        {P.slice(0, 4).map((p) => (
          <div key={p.name} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="relative h-[96px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="p-2.5">
              <p className="text-[13px] font-bold truncate">{p.name}</p>
              <p className="text-[12px] text-muted-foreground">★ {p.rating} · {p.area}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="px-4 mt-3 text-[12px] text-muted-foreground">➊ the chip opens the Import journey (B)</p>
      <Nav active="discover" />
    </>
  );
}

function VariantA() {
  return (
    <>
      <div className="px-4 pt-5">
        <p className="text-[20px] font-extrabold">Discover</p>
        {/* THE decision: one segmented control, two modes. */}
        <div className="mt-3 flex p-1 rounded-full bg-secondary border border-border">
          <div className="flex-1 h-11 rounded-full flex items-center justify-center text-[14px] font-bold text-muted-foreground">For you</div>
          <div className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 text-[14px] font-bold bg-card border border-border">
            <Heart size={16} weight="fill" style={{ color: "var(--clr-horizon)" }} /> Shortlist
            <span className="min-w-5 h-5 px-1 rounded-full text-[11px] font-black flex items-center justify-center text-white" style={{ background: "var(--clr-brand)" }}>5</span>
          </div>
        </div>
      </div>
      <div className="px-4 mt-4 space-y-2.5 overflow-hidden">
        {/* ENTRY ➋ — a quiet import row at the top of the Shortlist */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-dashed px-3.5 py-3" style={{ borderColor: "color-mix(in srgb, var(--clr-brand) 45%, transparent)" }}>
          <Sparkle size={18} weight="fill" style={{ color: "var(--clr-brand)" }} />
          <p className="flex-1 text-[13px] font-bold">Import from a link or screenshot</p>
          <CaretRight size={16} className="text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Sparkle size={16} weight="fill" style={{ color: "var(--clr-brand)" }} />
          <p className="text-[12px] font-bold uppercase tracking-wider text-tertiary">3 new · from your TikTok import</p>
        </div>
        {P.slice(0, 3).map((p) => (
          <div key={p.name} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="relative h-[110px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute top-2 start-2"><SrcChip src={p.src} by={p.by} /></div>
            </div>
            <div className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold truncate">{p.name}</p>
                <p className="text-[12px] text-muted-foreground"><Star size={12} weight="fill" className="inline -mt-0.5" /> {p.rating} · {p.area}</p>
              </div>
              <button className="h-10 px-4 rounded-full text-[13px] font-bold text-white flex items-center gap-1" style={{ background: "var(--clr-brand)" }}>
                <Plus size={16} weight="bold" /> Plan
              </button>
              <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
                <Heart size={18} weight="fill" style={{ color: "var(--clr-horizon)" }} />
              </button>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <p className="text-[12px] font-bold uppercase tracking-wider text-tertiary">Earlier</p>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={P[3].img} alt="" className="w-12 h-12 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold truncate">{P[3].name}</p>
            <p className="text-[12px] text-muted-foreground">♥ 2 · {P[3].area}</p>
          </div>
          <CaretRight size={16} className="text-muted-foreground" />
        </div>
      </div>
      <Nav active="discover" />
    </>
  );
}

/* B0 — journey entry (what every entry point opens) */
function VariantB0() {
  return (
    <>
      <div className="px-4 pt-5 flex items-center justify-between">
        <span className="text-[15px] font-bold text-muted-foreground">✕</span>
        <p className="text-[15px] font-bold">Import inspiration</p>
        <span className="w-4" />
      </div>
      <div className="px-4 mt-6">
        <p className="text-[22px] font-extrabold leading-tight">Drop your saved posts.</p>
        <p className="text-[14px] text-muted-foreground mt-1.5">TikTok or Instagram links, a caption, an article — we pull out the real places.</p>
        <div className="mt-5 rounded-2xl border border-border bg-card px-4 py-3.5">
          <p className="text-[14px] text-muted-foreground">Paste links or text…</p>
        </div>
        <button className="mt-4 w-full h-13 py-3.5 rounded-full text-[15px] font-bold text-white flex items-center justify-center gap-2" style={{ background: "var(--clr-brand)" }}>
          <Sparkle size={18} weight="fill" /> Find the places
        </button>
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-7 flex flex-col items-center gap-1.5">
          <p className="text-[14px] font-bold">Or drop a screenshot</p>
          <p className="text-[12px] text-muted-foreground">A saved post, a list, a map</p>
        </div>
        <div className="mt-6 rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: "color-mix(in srgb, var(--clr-brand) 10%, transparent)" }}>
          <TiktokLogo size={22} weight="fill" />
          <p className="flex-1 text-[13px] leading-snug"><span className="font-bold">Even faster:</span> in TikTok tap Share → <span className="font-bold">Paxawa</span>. Lands right here.</p>
        </div>
      </div>
    </>
  );
}

/* B1 — import journey: review deck */
function VariantB1() {
  const p = P[0];
  return (
    <>
      <div className="px-4 pt-5 flex items-center justify-between">
        <span className="text-[15px] font-bold text-muted-foreground">✕</span>
        <p className="text-[15px] font-bold">Import · 2 of 5</p>
        <span className="text-[13px] font-bold" style={{ color: "var(--clr-brand)" }}>Skip all</span>
      </div>
      <div className="px-2 mt-1 flex gap-1">
        {[1, 1, 0, 0, 0].map((f, i) => (
          <div key={i} className="flex-1 h-1 rounded-full" style={{ background: f ? "var(--clr-brand)" : "var(--border)" }} />
        ))}
      </div>
      <div className="px-4 mt-5">
        <div className="rounded-[24px] border border-border overflow-hidden bg-card elev-lg">
          <div className="relative h-[380px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: "linear-gradient(transparent, rgba(0,0,0,.75))" }} />
            <div className="absolute top-3 start-3"><SrcChip src={p.src} by={p.by} /></div>
            <div className="absolute bottom-3 start-4 end-4 text-white">
              <p className="text-[22px] font-extrabold leading-tight">{p.name}</p>
              <p className="text-[13px] text-white/85 mt-0.5"><Star size={14} weight="fill" className="inline -mt-0.5" /> {p.rating} · {p.area} · $$</p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-[13px] text-muted-foreground leading-relaxed">"Affordable and filling halal tempura in Ginza, even cheaper at lunch…" — the caption that mentioned it</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="flex-1 h-14 rounded-full border border-border bg-card text-[15px] font-bold">Skip</button>
          <button className="flex-1 h-14 rounded-full text-[15px] font-bold text-white flex items-center justify-center gap-2" style={{ background: "var(--clr-brand)" }}>
            <Heart size={20} weight="fill" /> Save
          </button>
        </div>
        <p className="text-center text-[12px] text-muted-foreground mt-4">Saved so far: Toribushi Ramen ♥</p>
      </div>
    </>
  );
}

/* B2 — journey done */
function VariantB2() {
  return (
    <>
      <div className="flex flex-col items-center pt-16 px-6">
        <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--clr-moss) 18%, transparent)" }}>
          <Check size={30} weight="bold" style={{ color: "var(--clr-moss)" }} />
        </span>
        <p className="text-[22px] font-extrabold mt-4">4 places saved</p>
        <p className="text-[14px] text-muted-foreground mt-1 text-center">They're on the crew's shortlist — everyone can heart and vote.</p>
        <div className="flex -space-x-3 mt-6">
          {P.slice(0, 4).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.name} src={p.img} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-background" />
          ))}
        </div>
        <button className="mt-8 w-full h-13 py-3.5 rounded-full text-[15px] font-bold text-white flex items-center justify-center gap-2" style={{ background: "var(--clr-brand)" }}>
          Open the shortlist <ArrowRight size={18} weight="bold" />
        </button>
        <button className="mt-3 w-full h-13 py-3.5 rounded-full border border-border bg-card text-[15px] font-bold flex items-center justify-center gap-2">
          <MapPin size={18} /> Drop them on the plan
        </button>
        <button className="mt-3 text-[14px] font-bold text-muted-foreground">Import more</button>
      </div>
      <div className="absolute bottom-10 inset-x-0 px-6">
        <p className="text-center text-[12px] text-muted-foreground">Tip: share from TikTok → Paxawa next time — no copy-paste.</p>
      </div>
    </>
  );
}

/* C — ideas tray in the Plan */
function VariantC() {
  return (
    <>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #202024 0%, #17171a 100%)" }}>
        <p className="absolute top-24 left-1/2 -translate-x-1/2 text-[13px] text-white/40">( map )</p>
      </div>
      <div className="absolute inset-x-0 bottom-[76px] rounded-t-[20px] border-t border-border" style={{ background: "var(--sheet-bg)", backdropFilter: "blur(10px)" }}>
        <div className="pt-3 pb-2 flex justify-center"><div className="w-10 h-1 rounded-full bg-foreground/25" /></div>
        <div className="px-3 pb-2 flex gap-1.5">
          {["All", "Sun 20 ·2", "Mon 21", "Tue 22"].map((d, i) => (
            <span key={d} className={`h-10 px-3.5 rounded-full text-[13px] font-bold flex items-center ${i === 1 ? "bg-card border border-border" : "text-muted-foreground"}`}>{d}</span>
          ))}
        </div>
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2.5 rounded-2xl bg-card border border-border p-3 mb-2">
            <span className="w-7 h-7 rounded-full text-white text-[12px] font-extrabold flex items-center justify-center" style={{ background: "var(--clr-wayfind)" }}>1</span>
            <div className="flex-1 min-w-0"><p className="text-[14px] font-bold">Hotel check-in</p><p className="text-[12px] text-muted-foreground">15:00 · Shinjuku</p></div>
            <DotsSixVertical size={18} className="text-muted-foreground/50" />
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl bg-card border border-border p-3">
            <span className="w-7 h-7 rounded-full text-white text-[12px] font-extrabold flex items-center justify-center" style={{ background: "var(--clr-wayfind)" }}>2</span>
            <div className="flex-1 min-w-0"><p className="text-[14px] font-bold">Shibuya crossing</p><p className="text-[12px] text-muted-foreground">18:00</p></div>
            <DotsSixVertical size={18} className="text-muted-foreground/50" />
          </div>
        </div>
        {/* THE decision: imports live IN the plan as a draggable ideas tray. */}
        <div className="px-4 pt-1 pb-4 border-t border-border/60">
          <div className="flex items-center justify-between pt-2.5 mb-2">
            <p className="text-[12px] font-bold uppercase tracking-wider text-tertiary flex items-center gap-1.5">
              <Sparkle size={14} weight="fill" style={{ color: "var(--clr-brand)" }} /> Ideas · 5 from your imports
            </p>
            <span className="text-[12px] font-bold" style={{ color: "var(--clr-brand)" }}>Import more</span>
          </div>
          <div className="flex gap-2.5 overflow-hidden">
            {P.slice(0, 4).map((p) => (
              <div key={p.name} className="shrink-0 w-[118px] rounded-2xl border border-dashed overflow-hidden bg-card" style={{ borderColor: "color-mix(in srgb, var(--clr-brand) 45%, transparent)" }}>
                <div className="relative h-[68px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <p className="p-1.5 text-[12px] font-bold leading-tight line-clamp-2">{p.name}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground mt-2">Hold an idea and drag it onto a day ↑</p>
        </div>
      </div>
      <Nav active="plan" />
    </>
  );
}


/* CHIP OPTIONS — how the Discover top row handles action-vs-filter */
function GlassHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#3a2f28 0%,#1c1917 60%)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PHOTOS.shrine} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
      <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="mb-2.5 flex p-1 rounded-full bg-black/35 backdrop-blur border border-white/15">
          <div className="flex-1 h-11 rounded-full flex items-center justify-center text-[14px] font-bold bg-white/90 text-neutral-900">For you</div>
          <div className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 text-[14px] font-bold text-white/85">♡ Shortlist</div>
        </div>
        {children}
      </div>
    </div>
  );
}
const FILTERS = ["All", "Food", "Sights", "Stay", "Activities"];
function GChip({ children, on = false, brand = false }: { children: React.ReactNode; on?: boolean; brand?: boolean }) {
  return (
    <span className={`h-10 px-3.5 rounded-full flex items-center gap-1.5 text-[13px] font-bold shrink-0 ${on ? "bg-white/90 text-neutral-900" : brand ? "text-white" : "bg-black/30 backdrop-blur text-white/85 border border-white/15"}`}
      style={brand ? { background: "var(--clr-brand)" } : undefined}>
      {children}
    </span>
  );
}
function ChipOpt1() {
  return (
    <GlassHeader>
      {/* 1 — the action is a BAR of its own; the rail is pure filters */}
      <div className="mb-2 h-11 rounded-2xl border border-dashed flex items-center gap-2 px-3.5 bg-black/35 backdrop-blur" style={{ borderColor: "color-mix(in srgb, var(--clr-brand) 70%, white)" }}>
        <Sparkle size={16} weight="fill" style={{ color: "#b6a8ff" }} />
        <span className="text-[13px] font-bold text-white flex-1">Import from TikTok / IG</span>
        <CaretRight size={16} className="text-white/70" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {FILTERS.map((f, i) => <GChip key={f} on={i === 0}>{f}</GChip>)}
      </div>
    </GlassHeader>
  );
}
function ChipOpt2() {
  return (
    <GlassHeader>
      {/* 2 — brand circle pinned at the start + divider, then filters */}
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: "var(--clr-brand)" }}>
          <Sparkle size={18} weight="fill" />
        </span>
        <span className="w-px h-7 bg-white/25 shrink-0" />
        {FILTERS.map((f, i) => <GChip key={f} on={i === 0}>{f}</GChip>)}
      </div>
    </GlassHeader>
  );
}
function ChipOpt3() {
  return (
    <GlassHeader>
      {/* 3 — rail is ONLY filters; import lives in Shortlist / + / deck */}
      <div className="flex gap-2 overflow-hidden">
        {FILTERS.map((f, i) => <GChip key={f} on={i === 0}>{f}</GChip>)}
        <GChip>⚙︎ Filters</GChip>
      </div>
    </GlassHeader>
  );
}
function ChipOpt4() {
  return (
    <GlassHeader>
      {/* 4 — grouped tones: solid brand ACTION chip, then outline filters */}
      <div className="flex gap-2 overflow-hidden">
        <GChip brand><Sparkle size={16} weight="fill" /> Import</GChip>
        {FILTERS.map((f, i) => <GChip key={f} on={i === 0}>{f}</GChip>)}
      </div>
    </GlassHeader>
  );
}


/* ── Round 14 lab: TikTok tabs, filter placement ideas, import-bar ideas ── */
function TikTabs({ active = "foryou" }: { active?: "foryou" | "short" }) {
  return (
    <div className="flex items-center justify-center gap-6 pt-1">
      <div className="flex flex-col items-center">
        <span className={`text-[16px] ${active === "short" ? "font-extrabold text-white" : "font-semibold text-white/60"}`}>Shortlist · 5</span>
        {active === "short" && <span className="mt-1 w-7 h-[3px] rounded-full bg-white" />}
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-[16px] ${active === "foryou" ? "font-extrabold text-white" : "font-semibold text-white/60"}`}>For You</span>
        {active === "foryou" && <span className="mt-1 w-7 h-[3px] rounded-full bg-white" />}
      </div>
    </div>
  );
}
function PhotoBg({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div className="absolute inset-0 bg-neutral-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PHOTOS.shrine} alt="" className={`absolute inset-0 w-full h-full object-cover ${dim ? "opacity-30" : "opacity-80"}`} />
      <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/70 to-transparent pb-6">{children}</div>
    </div>
  );
}
/* T1 — clean top: only the small tabs (filters hidden until Search) */
function LabT1() {
  return (
    <PhotoBg>
      <TikTabs />
      <p className="mt-3 text-center text-[12px] text-white/50">clean — no chips; filters live behind Search ↓</p>
    </PhotoBg>
  );
}
/* T2 — search opened from the nav: bar + the type chips below it */
function LabT2() {
  return (
    <PhotoBg dim>
      <TikTabs />
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-11 rounded-full bg-black/45 backdrop-blur border border-white/20 flex items-center px-3.5 gap-2">
          <span className="text-white/60 text-[14px]">⌕</span>
          <span className="text-white/50 text-[14px]">Search places in Tokyo…</span>
        </div>
        <span className="w-10 h-10 rounded-full bg-black/45 backdrop-blur border border-white/20 flex items-center justify-center text-white/80">✕</span>
      </div>
      <div className="mt-2.5 flex gap-2 overflow-hidden">
        {["All", "Food", "Sights", "Stay", "Activities"].map((f, i) => (
          <span key={f} className={`h-10 px-3.5 rounded-full flex items-center text-[13px] font-bold shrink-0 ${i === 0 ? "bg-white/90 text-neutral-900" : "bg-black/35 backdrop-blur text-white/85 border border-white/15"}`}>{f}</span>
        ))}
      </div>
      <p className="mt-3 text-center text-[12px] text-white/50">appears only after tapping Search in the nav</p>
    </PhotoBg>
  );
}
/* T3 — my alternative: one sliders button beside the tabs; active filter = one dismissible chip */
function LabT3() {
  return (
    <PhotoBg>
      <div className="relative">
        <TikTabs />
        <span className="absolute end-1 top-1 w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center text-white">
          <span className="text-[15px]">⚙︎</span>
        </span>
      </div>
      <div className="mt-3 flex justify-center">
        <span className="h-10 px-3.5 rounded-full bg-white/90 text-neutral-900 flex items-center gap-2 text-[13px] font-bold">
          Food <span className="text-neutral-500">✕</span>
        </span>
      </div>
      <p className="mt-3 text-center text-[12px] text-white/50">chips only exist as the ACTIVE filter; the rest live in the ⚙︎ sheet</p>
    </PhotoBg>
  );
}
/* I1 — dashed bar (the pick, refined tighter) */
function LabI1() {
  return (
    <PhotoBg>
      <TikTabs />
      <div className="mt-3 h-11 rounded-2xl border border-dashed flex items-center gap-2 px-3.5 bg-black/35 backdrop-blur" style={{ borderColor: "#a394ff" }}>
        <Sparkle size={16} weight="fill" style={{ color: "#b6a8ff" }} />
        <span className="text-[13px] font-bold text-white flex-1">Import from TikTok / IG</span>
        <CaretRight size={16} className="text-white/70" />
      </div>
    </PhotoBg>
  );
}
/* I2 — social bar: logos + Import pill */
function LabI2() {
  return (
    <PhotoBg>
      <TikTabs />
      <div className="mt-3 h-12 rounded-2xl flex items-center gap-2.5 ps-3 pe-1.5 bg-black/45 backdrop-blur border border-white/15">
        <span className="flex -space-x-1.5">
          <span className="w-7 h-7 rounded-full bg-black flex items-center justify-center border border-white/25"><TiktokLogo size={16} weight="fill" className="text-white" /></span>
          <span className="w-7 h-7 rounded-full flex items-center justify-center border border-white/25" style={{ background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }}><InstagramLogo size={16} weight="fill" className="text-white" /></span>
        </span>
        <span className="text-[13px] font-bold text-white flex-1">Drop a link or screenshot</span>
        <span className="h-9 px-4 rounded-full text-[13px] font-bold text-white flex items-center" style={{ background: "var(--clr-brand)" }}>Import</span>
      </div>
    </PhotoBg>
  );
}
/* I3 — input-look bar: reads like a paste field */
function LabI3() {
  return (
    <PhotoBg>
      <TikTabs />
      <div className="mt-3 h-12 rounded-full flex items-center gap-2.5 ps-4 pe-1.5 bg-black/45 backdrop-blur border border-white/20">
        <span className="text-white/60 text-[15px]">🔗</span>
        <span className="text-[13.5px] text-white/55 flex-1">Paste a TikTok link…</span>
        <span className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: "var(--clr-brand)" }}>
          <Sparkle size={16} weight="fill" />
        </span>
      </div>
    </PhotoBg>
  );
}


/* Round 15: tab styles + smaller chips, with the approved I2 bar in place */
function I2Bar() {
  return (
    <div className="mt-3 h-12 rounded-2xl flex items-center gap-2.5 ps-3 pe-1.5 bg-black/45 backdrop-blur border border-white/15">
      <span className="flex -space-x-1.5">
        <span className="w-7 h-7 rounded-full bg-black flex items-center justify-center border border-white/25"><TiktokLogo size={16} weight="fill" className="text-white" /></span>
        <span className="w-7 h-7 rounded-full flex items-center justify-center border border-white/25" style={{ background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }}><InstagramLogo size={16} weight="fill" className="text-white" /></span>
      </span>
      <span className="text-[13px] font-bold text-white flex-1">Drop a link or screenshot</span>
      <span className="h-9 px-4 rounded-full text-[13px] font-bold text-white flex items-center" style={{ background: "var(--clr-brand)" }}>Import</span>
    </div>
  );
}
/* S1 — brand dot: active word white-bold with a small BRAND dot under it */
function LabS1() {
  return (
    <PhotoBg>
      <div className="flex items-center justify-center gap-7 pt-1">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[15px] font-semibold text-white/55">Shortlist · 5</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[16px] font-extrabold text-white">For You</span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--clr-brand)", boxShadow: "0 0 8px var(--clr-brand)" }} />
        </div>
      </div>
      <I2Bar />
    </PhotoBg>
  );
}
/* S2 — glass capsule: a small glass pill hugs the ACTIVE word and slides */
function LabS2() {
  return (
    <PhotoBg>
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="h-9 px-3.5 rounded-full flex items-center text-[14px] font-semibold text-white/60">Shortlist · 5</span>
        <span className="h-9 px-3.5 rounded-full flex items-center text-[14px] font-extrabold text-white bg-white/18 backdrop-blur border border-white/25">For You</span>
      </div>
      <I2Bar />
    </PhotoBg>
  );
}
/* S3 — T2 with SMALLER chips (h-8, 12px) under the search bar */
function LabS3() {
  return (
    <PhotoBg dim>
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="h-9 px-3.5 rounded-full flex items-center text-[14px] font-semibold text-white/60">Shortlist · 5</span>
        <span className="h-9 px-3.5 rounded-full flex items-center text-[14px] font-extrabold text-white bg-white/18 backdrop-blur border border-white/25">For You</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-11 rounded-full bg-black/45 backdrop-blur border border-white/20 flex items-center px-3.5 gap-2">
          <span className="text-white/60 text-[14px]">⌕</span>
          <span className="text-white/50 text-[14px]">Search places in Tokyo…</span>
        </div>
        <span className="w-10 h-10 rounded-full bg-black/45 backdrop-blur border border-white/20 flex items-center justify-center text-white/80">✕</span>
      </div>
      <div className="mt-2.5 flex gap-1.5 overflow-hidden">
        {["All", "Food", "Sights", "Stay", "Activities", "Coffee"].map((f, i) => (
          <span key={f} className={`h-8 px-3 rounded-full flex items-center text-[12px] font-bold shrink-0 ${i === 0 ? "bg-white/90 text-neutral-900" : "bg-black/35 backdrop-blur text-white/85 border border-white/15"}`}>{f}</span>
        ))}
      </div>
    </PhotoBg>
  );
}

function Lab() {
  const v = useSearchParams().get("v") ?? "a";
  return (
    <div className="min-h-svh bg-background text-foreground flex items-start justify-center gap-8 p-6 flex-wrap">
      {v === "a1" && <Phone label="A — Discover · For you (entry ➊)"><VariantA1 /></Phone>}
      {v === "a" && <Phone label="A — Discover · Shortlist (entry ➋)"><VariantA /></Phone>}
      {v === "b0" && <Phone label="B — Journey entry"><VariantB0 /></Phone>}
      {v === "b1" && <Phone label="B — Import journey: review deck"><VariantB1 /></Phone>}
      {v === "b2" && <Phone label="B — Journey done"><VariantB2 /></Phone>}
      {v === "c" && <Phone label="C — Ideas tray in the Plan"><VariantC /></Phone>}
      {v === "c1" && <Phone label="1 — Import is its own bar"><ChipOpt1 /></Phone>}
      {v === "c2" && <Phone label="2 — Pinned circle + divider"><ChipOpt2 /></Phone>}
      {v === "c3" && <Phone label="3 — Filters only (no chip)"><ChipOpt3 /></Phone>}
      {v === "c4" && <Phone label="4 — Grouped tones"><ChipOpt4 /></Phone>}
      {v === "t1" && <Phone label="T1"><LabT1 /></Phone>}
      {v === "t2" && <Phone label="T2"><LabT2 /></Phone>}
      {v === "t3" && <Phone label="T3"><LabT3 /></Phone>}
      {v === "i1" && <Phone label="I1"><LabI1 /></Phone>}
      {v === "i2" && <Phone label="I2"><LabI2 /></Phone>}
      {v === "i3" && <Phone label="I3"><LabI3 /></Phone>}
      {v === "s1" && <Phone label="S1"><LabS1 /></Phone>}
      {v === "s2" && <Phone label="S2"><LabS2 /></Phone>}
      {v === "s3" && <Phone label="S3"><LabS3 /></Phone>}
    </div>
  );
}

export default function InspireLab() {
  return <Suspense><Lab /></Suspense>;
}
