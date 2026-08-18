"use client";

import { useRef, useState, useTransition } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/locale-provider";
import { createClient } from "@/lib/supabase/client";
import { protectedFileUrl } from "@/lib/storage-url";
import { addConfirmations } from "@/lib/actions/confirmations";
import type { ParsedConfirmation, ParseResponse } from "@/lib/confirmations/types";
import { toast } from "sonner";
import {
  Camera, ClipboardText, Ticket, Airplane, Bed, Train, MapPin, CaretRight, CircleNotch, Check, PencilSimple, Trash,
} from "@phosphor-icons/react/dist/ssr";

/**
 * "Add a confirmation" — flight, hotel, train, ticket. Three ways in, one
 * read-back preview, one save. Lands on the plan (anchor stops), the
 * Departure Board, docs (if a file), and — next steps — the ticket/horizon.
 *
 * Snap  → upload to trip-documents (private bucket, uid/trip path) → parse
 * Paste → parse text
 * Type  → parse hint
 * Nothing is saved until the user taps Add.
 */
type Mode = "pick" | "paste" | "type" | "reading" | "preview";

export function AddConfirmationSheet({
  open, onClose, tripId, tripStart, tripEnd, inboundAddress = null,
}: { open: boolean; onClose: () => void; tripId: string; tripStart: string; tripEnd: string; inboundAddress?: string | null }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("pick");
  const [items, setItems] = useState<ParsedConfirmation[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [file, setFile] = useState<{ url: string; title: string } | null>(null);
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function reset() { setMode("pick"); setItems([]); setReason(null); setFile(null); setText(""); setHint(""); }
  function close() { reset(); onClose(); }

  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  async function parse(payload: Record<string, unknown>) {
    setMode("reading");
    const res = await fetch("/api/ai/parse-confirmation", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, tripStart, tripEnd, tz }),
    });
    const data = (await res.json().catch(() => ({ items: [] }))) as ParseResponse;
    setItems(data.items ?? []);
    setReason(data.items?.length ? null : data.reason ?? t("confirm.nothingFound"));
    setMode("preview");
  }

  async function onFile(f: File) {
    if (!f) return;
    setMode("reading");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      const path = `${user.id}/${tripId}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("trip-documents").upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type || undefined });
      if (error) throw new Error(error.message);
      setFile({ url: protectedFileUrl("trip-documents", path), title: f.name.replace(/\.[^.]+$/, "") });
      // read locally for the extractor: images go to vision, PDFs have their
      // text extracted server-side (scans fall back to paste/type).
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
      if (f.type.startsWith("image/")) await parse({ image: b64, mediaType: f.type });
      else if (f.type === "application/pdf") await parse({ pdf: b64 });
      else { setItems([]); setReason(t("confirm.pdfNotReadYet")); setMode("preview"); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.failed"));
      setMode("pick");
    }
  }

  function save() {
    start(async () => {
      try {
        const r = await addConfirmations({ tripId, items, fileUrl: file?.url ?? null, fileTitle: file?.title ?? null });
        toast.success(t("confirm.saved", { count: r.saved }));
        close();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("common.failed"));
      }
    });
  }

  const update = (i: number, patch: Partial<ParsedConfirmation>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setItems((xs) => xs.filter((_, j) => j !== i));

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={t("confirm.title")}
      size={mode === "preview" ? "lg" : "md"}
      footer={mode === "preview" && items.length > 0 ? (
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={pending} className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2">
            {pending && <CircleNotch className="w-4 h-4 animate-spin" />}
            {t("confirm.addN", { count: items.length })}
          </button>
          <button type="button" onClick={() => { setItems([]); setMode("pick"); }} className="h-12 px-5 rounded-full border border-border font-bold text-[14px]">{t("confirm.startOver")}</button>
        </div>
      ) : undefined}
    >
      <p className="text-[13px] text-muted-foreground mb-4">{t("confirm.subtitle")}</p>

      {mode === "pick" && (
        <div className="space-y-2.5">
          <input ref={fileInput} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.currentTarget.value = ""; }} />
          <ModeRow icon={Camera} hue="var(--clr-horizon)" title={t("confirm.snap")} sub={t("confirm.snapSub")} onClick={() => fileInput.current?.click()} />
          <ModeRow icon={ClipboardText} hue="var(--clr-brand)" title={t("confirm.paste")} sub={t("confirm.pasteSub")} onClick={() => setMode("paste")} />
          <ModeRow icon={Ticket} hue="var(--clr-wayfind)" title={t("confirm.type")} sub={t("confirm.typeSub")} onClick={() => setMode("type")} />
          {inboundAddress && (
            <button
              type="button"
              onClick={() => { void navigator.clipboard?.writeText(inboundAddress); toast.success(t("common.copied")); }}
              className="w-full text-start text-[12px] text-muted-foreground pt-1 px-1"
            >
              {t("confirm.forwardTo")} <span className="font-semibold text-foreground">{inboundAddress}</span> — {t("confirm.forwardSame")}
            </button>
          )}
        </div>
      )}

      {mode === "paste" && (
        <div className="space-y-3">
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={t("confirm.pastePlaceholder")} className="w-full rounded-2xl border border-border bg-card px-3.5 py-3 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40" />
          <div className="flex gap-2">
            <button type="button" disabled={text.trim().length < 12} onClick={() => void parse({ text })} className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-bold disabled:opacity-50">{t("confirm.read")}</button>
            <button type="button" onClick={() => setMode("pick")} className="h-12 px-5 rounded-full border border-border font-bold text-[14px]">{t("common.back")}</button>
          </div>
        </div>
      )}

      {mode === "type" && (
        <div className="space-y-3">
          <input autoFocus value={hint} onChange={(e) => setHint(e.target.value)} placeholder={t("confirm.typePlaceholder")} className="w-full h-12 rounded-2xl border border-border bg-card px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/40" />
          <p className="text-[12px] text-muted-foreground">{t("confirm.typeHelp")}</p>
          <div className="flex gap-2">
            <button type="button" disabled={hint.trim().length < 3} onClick={() => void parse({ hint })} className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-bold disabled:opacity-50">{t("confirm.read")}</button>
            <button type="button" onClick={() => setMode("pick")} className="h-12 px-5 rounded-full border border-border font-bold text-[14px]">{t("common.back")}</button>
          </div>
        </div>
      )}

      {mode === "reading" && (
        <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
          <CircleNotch className="w-6 h-6 animate-spin text-primary" />
          <p className="text-[14px]">{t("confirm.reading")}</p>
        </div>
      )}

      {mode === "preview" && (
        <div className="space-y-3">
          {items.length > 0 ? (
            <div className="rounded-2xl border border-[color:var(--clr-wayfind)]/40 bg-[color:var(--clr-wayfind-dim)] px-3.5 py-2.5 text-[12px] flex items-center gap-2">
              <Check size={14} weight="bold" className="text-[color:var(--clr-wayfind)]" />
              <span className="font-semibold">{t("confirm.found", { count: items.length })}</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/40 px-3.5 py-3 text-[13px]">
              <p className="font-semibold">{t("confirm.nothingFound")}</p>
              {reason && <p className="text-muted-foreground mt-0.5">{reason}</p>}
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setMode("type")} className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-bold">{t("confirm.typeInstead")}</button>
                <button type="button" onClick={() => setMode("pick")} className="h-10 px-4 rounded-full border border-border text-[13px] font-bold">{t("common.back")}</button>
              </div>
            </div>
          )}
          {items.map((it, i) => <PreviewCard key={i} it={it} onChange={(p) => update(i, p)} onRemove={() => remove(i)} />)}
          {items.length > 0 && (
            <div className="text-[12px] text-muted-foreground space-y-1 px-1">
              <p>{t("confirm.landsPlan")}</p>
              {file && <p>{t("confirm.landsDocs")}</p>}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function ModeRow({ icon: I, hue, title, sub, onClick }: { icon: typeof MapPin; hue: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-start active:scale-[0.99] transition-transform">
      <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${hue} 14%, transparent)` }}><I size={20} weight="fill" style={{ color: hue }} /></span>
      <span className="flex-1 min-w-0"><span className="block text-[15px] font-bold">{title}</span><span className="block text-[12px] text-muted-foreground">{sub}</span></span>
      <CaretRight size={16} className="text-muted-foreground rtl:rotate-180" />
    </button>
  );
}

const KIND_ICON = { flight: Airplane, hotel: Bed, train: Train, other: Ticket } as const;
const KIND_HUE = { flight: "var(--clr-horizon)", hotel: "var(--clr-brand)", train: "var(--clr-wayfind)", other: "var(--clr-dune)" } as const;

function PreviewCard({ it, onChange, onRemove }: { it: ParsedConfirmation; onChange: (p: Partial<ParsedConfirmation>) => void; onRemove: () => void }) {
  const t = useT();
  const [edit, setEdit] = useState(false);
  const I = KIND_ICON[it.kind];
  const hue = KIND_HUE[it.kind];
  const route = it.from && it.to ? `${it.from} → ${it.to}` : null;
  const when = [it.date, it.time].filter(Boolean).join(" · ");
  const until = it.kind === "hotel" && it.endDate ? ` → ${it.endDate}` : "";
  const field = "h-9 rounded-lg border border-border bg-background px-2.5 text-[13px] w-full";
  return (
    <div className="rounded-3xl overflow-hidden border border-border">
      <div className="p-4 text-black" style={{ background: hue }}>
        <div className="flex items-center justify-between text-[10px] font-black tracking-[0.2em] uppercase opacity-70">
          <span>{t(`confirm.kind.${it.kind}`)}</span><span>{it.confidence < 0.6 ? t("confirm.checkThis") : ""}</span>
        </div>
        <div className="flex items-start justify-between gap-3 mt-1">
          <div className="min-w-0">
            <p className="text-[22px] font-black leading-tight truncate">{it.title}</p>
            <p className="text-[12px] font-semibold opacity-80 truncate">{[it.provider, route].filter(Boolean).join(" · ") || " "}</p>
          </div>
          <I size={24} weight="fill" className="shrink-0 mt-1" />
        </div>
        <p className="text-[12px] font-semibold mt-2 opacity-85">
          {when || t("confirm.noDate")}{until}{it.confirmation ? ` · ${t("confirm.conf")} ${it.confirmation}` : ""}
        </p>
        {(it.address || it.notes) && <p className="text-[11px] opacity-75 mt-0.5 truncate">{[it.address, it.notes].filter(Boolean).join(" · ")}</p>}
      </div>
      <div className="bg-card px-3.5 py-2 flex items-center gap-3 text-[12px]">
        <button type="button" onClick={() => setEdit((v) => !v)} className="font-bold text-primary flex items-center gap-1"><PencilSimple size={13} />{edit ? t("common.close") : t("confirm.edit")}</button>
        <span className="flex-1" />
        <button type="button" onClick={onRemove} className="text-muted-foreground flex items-center gap-1"><Trash size={13} />{t("common.remove")}</button>
      </div>
      {edit && (
        <div className="bg-card border-t border-border p-3 grid grid-cols-2 gap-2">
          <label className="col-span-2 text-[11px] text-muted-foreground">{t("confirm.f.title")}<input className={field} value={it.title} onChange={(e) => onChange({ title: e.target.value })} /></label>
          <label className="text-[11px] text-muted-foreground">{t("confirm.f.date")}<input type="date" className={field} value={it.date ?? ""} onChange={(e) => onChange({ date: e.target.value || null })} /></label>
          <label className="text-[11px] text-muted-foreground">{t("confirm.f.time")}<input type="time" className={field} value={it.time ?? ""} onChange={(e) => onChange({ time: e.target.value || null })} /></label>
          {it.kind === "hotel" ? (
            <label className="text-[11px] text-muted-foreground">{t("confirm.f.checkout")}<input type="date" className={field} value={it.endDate ?? ""} onChange={(e) => onChange({ endDate: e.target.value || null })} /></label>
          ) : (
            <>
              <label className="text-[11px] text-muted-foreground">{t("confirm.f.from")}<input className={field} value={it.from ?? ""} onChange={(e) => onChange({ from: e.target.value || null })} /></label>
              <label className="text-[11px] text-muted-foreground">{t("confirm.f.to")}<input className={field} value={it.to ?? ""} onChange={(e) => onChange({ to: e.target.value || null })} /></label>
            </>
          )}
          <label className="text-[11px] text-muted-foreground">{t("confirm.f.conf")}<input className={field} value={it.confirmation ?? ""} onChange={(e) => onChange({ confirmation: e.target.value || null })} /></label>
        </div>
      )}
    </div>
  );
}
