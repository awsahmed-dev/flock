"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/locale-provider";
import { togglePlaceLike } from "@/lib/actions/place-likes";
import type { Place } from "@/lib/places/types";
import { toast } from "sonner";
import { Sparkle, Heart, Check, Star, CircleNotch, Image as ImageIcon, MapPin, ArrowRight, TiktokLogo } from "@phosphor-icons/react/dist/ssr";

/**
 * B — the Import journey. Entry (paste / screenshot / shared link) → review
 * deck, one place at a time (Save = crew heart / Skip) → done, pointing at
 * the Shortlist (A). Replaces the old cramped sheet. The nav bar is untouched.
 */
type Step = "entry" | "reading" | "deck" | "done";

const NEW_KEY = "paxawa-inspire-new";

export function ImportJourney({ tripId, prefill }: { tripId: string; prefill: string }) {
  const t = useT();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("entry");
  const [input, setInput] = useState(prefill);
  const [places, setPlaces] = useState<Place[]>([]);
  const [misses, setMisses] = useState<string[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);

  async function parse(body: Record<string, string>) {
    setStep("reading");
    try {
      const res = await fetch("/api/ai/parse-inspiration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, ...body }),
      });
      const data = (await res.json()) as { places?: Place[]; misses?: string[]; reason?: string };
      setPlaces(data.places ?? []);
      setMisses(data.misses ?? []);
      setReason(data.reason ?? null);
      setIdx(0);
      setStep(data.places?.length ? "deck" : "entry");
      if (!data.places?.length) toast.error(data.reason ?? t("inspire.nothing"));
    } catch {
      setStep("entry");
      toast.error(t("inspire.failed"));
    }
  }

  async function onFile(f: File) {
    if (!f.type.startsWith("image/")) { toast.error(t("inspire.imagesOnly")); return; }
    const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
    void parse({ image: b64, mediaType: f.type });
  }

  function advance() {
    if (idx + 1 >= places.length) {
      try { sessionStorage.setItem(NEW_KEY, JSON.stringify([...savedIds])); } catch { /* ignore */ }
      setStep("done");
    } else {
      setIdx(idx + 1);
    }
  }

  async function saveCurrent() {
    const p = places[idx];
    setSaving(true);
    try {
      const r = await togglePlaceLike(tripId, p.placeId);
      if (r.liked) setSavedIds((prev) => new Set(prev).add(p.placeId));
      advance();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep("entry"); setInput(""); setPlaces([]); setMisses([]); setReason(null); setIdx(0); setSavedIds(new Set());
  }

  const p = places[idx];
  const savedPlaces = places.filter((x) => savedIds.has(x.placeId));

  return (
    <div className="mx-auto max-w-md px-4 pb-28">
      {step === "entry" && (
        <div className="pt-4">
          <h1 className="text-[22px] font-extrabold leading-tight">{t("inspire.journeyTitle")}</h1>
          <p className="text-[14px] text-muted-foreground mt-1.5">{t("inspire.subtitle")}</p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder={t("inspire.placeholder")}
            className="mt-5 w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="button"
            disabled={input.trim().length < 4}
            onClick={() => void parse({ text: input.trim() })}
            className="mt-4 w-full h-12 rounded-full text-[15px] font-bold text-primary-foreground bg-primary disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkle size={18} weight="fill" /> {t("inspire.extract")}
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.currentTarget.value = ""; }} />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-4 w-full flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-7 hover:bg-muted/60 transition-colors text-center"
          >
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">{t("inspire.dropShot")}</span>
            <span className="text-xs text-muted-foreground">{t("inspire.dropShotSub")}</span>
          </button>
          <div className="mt-6 rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: "color-mix(in srgb, var(--clr-brand) 10%, transparent)" }}>
            <TiktokLogo size={22} weight="fill" className="shrink-0" />
            <p className="flex-1 text-[13px] leading-snug">
              <span className="font-bold">{t("inspire.shareTipLead")}</span> {t("inspire.shareTipBody")}
            </p>
          </div>
        </div>
      )}

      {step === "reading" && (
        <div className="pt-32 flex flex-col items-center gap-3 text-muted-foreground">
          <CircleNotch className="w-7 h-7 animate-spin text-primary" />
          <p className="text-[14px]">{t("inspire.reading")}</p>
        </div>
      )}

      {step === "deck" && p && (
        <div className="pt-4">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold">{t("inspire.deckProgress", { n: idx + 1, total: places.length })}</p>
            <button type="button" onClick={() => { setIdx(places.length - 1); advance(); }} className="text-[13px] font-bold" style={{ color: "var(--clr-brand)" }}>
              {t("inspire.skipAll")}
            </button>
          </div>
          <div className="mt-2 flex gap-1">
            {places.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i <= idx ? "var(--clr-brand)" : "var(--border)" }} />
            ))}
          </div>
          <div className="mt-4 rounded-[24px] border border-border overflow-hidden bg-card elev-lg">
            <div className="relative h-[340px] bg-muted">
              {p.photoRef && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=800`} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: "linear-gradient(transparent, rgba(0,0,0,.78))" }} />
              <div className="absolute bottom-3 start-4 end-4 text-white">
                <p className="text-[20px] font-extrabold leading-tight">{p.name}</p>
                <p className="text-[13px] text-white/85 mt-0.5">
                  {p.rating ? <><Star size={14} weight="fill" className="inline -mt-0.5" /> {p.rating}</> : null}
                  {p.rating && p.address ? " · " : ""}{p.address ?? ""}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="button" onClick={advance} className="flex-1 h-13 py-3.5 rounded-full border border-border bg-card text-[15px] font-bold">
              {t("inspire.skip")}
            </button>
            <button type="button" disabled={saving} onClick={() => void saveCurrent()} className="flex-1 h-13 py-3.5 rounded-full text-[15px] font-bold text-primary-foreground bg-primary disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <CircleNotch className="w-5 h-5 animate-spin" /> : <Heart size={20} weight="fill" />} {t("inspire.save")}
            </button>
          </div>
          {savedPlaces.length > 0 && (
            <p className="text-center text-[12px] text-muted-foreground mt-4">
              {t("inspire.savedSoFar", { names: savedPlaces.map((x) => x.name).slice(-2).join(" · ") })}
            </p>
          )}
        </div>
      )}

      {step === "done" && (
        <div className="pt-14 flex flex-col items-center text-center">
          <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--clr-moss) 18%, transparent)" }}>
            <Check size={30} weight="bold" style={{ color: "var(--clr-moss)" }} />
          </span>
          <p className="text-[22px] font-extrabold mt-4">{t("inspire.doneCount", { count: savedIds.size })}</p>
          <p className="text-[14px] text-muted-foreground mt-1">{t("inspire.doneSub")}</p>
          {savedPlaces.length > 0 && (
            <div className="flex -space-x-3 mt-6">
              {savedPlaces.slice(0, 5).map((x) => (
                <span key={x.placeId} className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-background bg-muted inline-block">
                  {x.photoRef && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/discover/photo?ref=${encodeURIComponent(x.photoRef)}&w=160`} alt="" className="w-full h-full object-cover" />
                  )}
                </span>
              ))}
            </div>
          )}
          {misses.length > 0 && (
            <p className="text-[12px] text-muted-foreground mt-4">{t("inspire.misses", { names: misses.join(" · ") })}</p>
          )}
          <button
            type="button"
            onClick={() => router.push(`/trips/${tripId}/discover?filter=saved`)}
            className="mt-8 w-full h-13 py-3.5 rounded-full text-[15px] font-bold text-primary-foreground bg-primary flex items-center justify-center gap-2"
          >
            {t("inspire.openShortlist")} <ArrowRight size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/trips/${tripId}/itinerary`)}
            className="mt-3 w-full h-13 py-3.5 rounded-full border border-border bg-card text-[15px] font-bold flex items-center justify-center gap-2"
          >
            <MapPin size={18} /> {t("inspire.dropOnPlan")}
          </button>
          <button type="button" onClick={reset} className="mt-4 text-[14px] font-bold text-muted-foreground">
            {t("inspire.another")}
          </button>
          {reason && savedIds.size === 0 && <p className="text-[12px] text-muted-foreground mt-3">{reason}</p>}
        </div>
      )}
    </div>
  );
}
