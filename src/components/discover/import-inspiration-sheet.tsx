"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/locale-provider";
import { togglePlaceLike } from "@/lib/actions/place-likes";
import type { Place } from "@/lib/places/types";
import { toast } from "sonner";
import { Link as LinkIcon, Image as ImageIcon, CircleNotch, Heart, Check, Sparkle } from "@phosphor-icons/react/dist/ssr";

/**
 * Inspiration import — paste a TikTok/Instagram/blog link, a caption, or drop
 * a screenshot; AI extracts the places and grounds them on the map. Each card
 * saves to the crew shortlist (a heart), which already feeds Discover, the
 * Huddle suggestion, and the free-day ideas on Now.
 */
export function ImportInspirationSheet({ tripId, open, onClose, initialInput }: { tripId: string; open: boolean; onClose: () => void; initialInput?: string }) {
  const t = useT();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  // Share-target / deep-link prefill: fill once each time the sheet opens.
  const prefillKey = useRef<string | null>(null);
  useEffect(() => {
    if (open && initialInput && prefillKey.current !== initialInput) {
      prefillKey.current = initialInput;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot prefill on open
      setInput(initialInput);
    }
    if (!open) prefillKey.current = null;
  }, [open, initialInput]);
  const [mode, setMode] = useState<"pick" | "reading" | "results">("pick");
  const [places, setPlaces] = useState<Place[]>([]);
  const [misses, setMisses] = useState<string[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  function close() {
    onClose();
    setMode("pick"); setInput(""); setPlaces([]); setMisses([]); setReason(null); setSaved(new Set());
  }

  async function parse(body: Record<string, string>) {
    setMode("reading");
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
      setMode("results");
    } catch {
      setReason(t("inspire.failed"));
      setPlaces([]); setMisses([]);
      setMode("results");
    }
  }

  function submitText() {
    const v = input.trim();
    if (v.length < 4) return;
    // The server finds every URL in the text itself — one field, any mix.
    void parse({ text: v });
  }

  async function onFile(f: File) {
    if (!f.type.startsWith("image/")) { toast.error(t("inspire.imagesOnly")); return; }
    const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
    void parse({ image: b64, mediaType: f.type });
  }

  async function save(p: Place) {
    setSavingId(p.placeId);
    try {
      const r = await togglePlaceLike(tripId, p.placeId);
      setSaved((prev) => { const n = new Set(prev); if (r.liked) n.add(p.placeId); else n.delete(p.placeId); return n; });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingId(null);
    }
  }

  async function saveAll() {
    setSavingAll(true);
    for (const p of places) {
      if (!saved.has(p.placeId)) {
        await save(p);
      }
    }
    setSavingAll(false);
    toast.success(t("inspire.savedAll"));
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={t("inspire.title")}
      size="md"
      footer={mode === "results" && places.length > 0 ? (
        places.every((p) => saved.has(p.placeId)) ? (
          /* Round 12: after saving, TAKE the person to where the saves live —
             "the like, where it goes? no access to it." */
          <button
            type="button"
            onClick={() => { const dest = `/trips/${tripId}/discover?filter=saved`; close(); router.push(dest); }}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-[15px] flex items-center justify-center gap-2"
          >
            {t("inspire.seeShortlist")}
          </button>
        ) : (
          <button type="button" onClick={() => void saveAll()} disabled={savingAll} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2">
            {savingAll && <CircleNotch className="w-4 h-4 animate-spin" />}
            {t("inspire.saveAll", { count: places.filter((p) => !saved.has(p.placeId)).length })}
          </button>
        )
      ) : undefined}
    >
      <p className="text-[13px] text-muted-foreground mb-4">{t("inspire.subtitle")}</p>

      {mode === "pick" && (
        <div className="space-y-4">
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder={t("inspire.placeholder")}
            className="w-full rounded-2xl border border-border bg-card px-3.5 py-3 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button type="button" disabled={input.trim().length < 4} onClick={submitText} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-[15px] disabled:opacity-50 flex items-center justify-center gap-2">
            <Sparkle size={16} weight="fill" /> {t("inspire.extract")}
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.currentTarget.value = ""; }} />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 hover:bg-muted/60 transition-colors text-center"
          >
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">{t("inspire.dropShot")}</span>
            <span className="text-xs text-muted-foreground">{t("inspire.dropShotSub")}</span>
          </button>
        </div>
      )}

      {mode === "reading" && (
        <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
          <CircleNotch className="w-6 h-6 animate-spin text-primary" />
          <p className="text-[14px]">{t("inspire.reading")}</p>
        </div>
      )}

      {mode === "results" && (
        <div className="space-y-3">
          {places.length > 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("inspire.found", { count: places.length })}</p>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/40 px-3.5 py-3 text-[13px]">
              <p className="font-semibold">{t("inspire.nothing")}</p>
              {reason && <p className="text-muted-foreground mt-0.5">{reason}</p>}
              <button type="button" onClick={() => setMode("pick")} className="mt-3 h-10 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-bold">{t("common.back")}</button>
            </div>
          )}
          {places.map((p) => {
            const isSaved = saved.has(p.placeId);
            return (
              <div key={p.placeId} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                  {p.photoRef && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=160`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold leading-tight line-clamp-1">{p.name}</p>
                  <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">
                    {p.rating ? `★ ${p.rating}` : ""}{p.rating && p.address ? " · " : ""}{p.address ?? ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void save(p)}
                  disabled={savingId === p.placeId}
                  aria-pressed={isSaved}
                  className={`shrink-0 h-10 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 border transition-colors ${isSaved ? "border-transparent" : "border-border bg-card"}`}
                  style={isSaved ? { background: "color-mix(in srgb, var(--clr-brand) 14%, transparent)", color: "var(--clr-brand)" } : undefined}
                >
                  {savingId === p.placeId ? <CircleNotch className="w-4 h-4 animate-spin" /> : isSaved ? <Check size={16} weight="bold" /> : <Heart size={16} />}
                  {isSaved ? t("inspire.saved") : t("inspire.save")}
                </button>
              </div>
            );
          })}
          {misses.length > 0 && (
            <p className="text-[12px] text-muted-foreground px-1">{t("inspire.misses", { names: misses.join(" · ") })}</p>
          )}
          {places.length > 0 && (
            <button
              type="button"
              onClick={() => { const dest = `/trips/${tripId}/discover?filter=saved`; close(); router.push(dest); }}
              className="flex items-center gap-2 text-[13px] font-bold px-1"
              style={{ color: "var(--clr-brand)" }}
            >
              <LinkIcon size={16} />
              {t("inspire.seeShortlist")}
            </button>
          )}
          <button type="button" onClick={() => { setMode("pick"); setPlaces([]); setMisses([]); }} className="h-10 px-4 rounded-full border border-border text-[13px] font-bold">{t("inspire.another")}</button>
        </div>
      )}
    </BottomSheet>
  );
}
