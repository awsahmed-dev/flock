"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, X, Star, MapPin } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";
import type { SavedRow } from "@/lib/actions/saves";

/**
 * «وش الحين؟» — the mid-trip answer.
 *
 * The skeptic's hardest truth: the highest-value planning moment is day 3 at
 * 6pm, standing somewhere, deciding what to do next — and the old wizard
 * structurally could not appear there. The saves the crew already made are
 * exactly the right answer pool: things they chose, that they haven't done
 * yet. No generation, no network, no questions.
 */
export function WhatsNow({
  tripId,
  saves,
  className = "",
}: {
  tripId: string;
  saves: SavedRow[];
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  // Only things still undone — a suggestion you already did is noise.
  const pool = saves.filter((s) => s.status !== "planned");
  if (pool.length === 0) return null;

  const pick = pool.slice(0, 3);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full bg-primary/12 text-primary px-3.5 h-9 text-[13px] font-bold ${className}`}
      >
        <Compass size={15} weight="fill" />
        {t("now.whatsNow")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            className="relative w-full rounded-t-3xl bg-card border-t border-border p-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom,0) + 1rem)" }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-extrabold text-[17px]">{t("now.whatsNowTitle")}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")}>
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            <p className="text-[12.5px] text-muted-foreground mb-3">{t("now.whatsNowBody")}</p>

            <ul className="space-y-2">
              {pick.map((s) => (
                <li key={s.id} className="rounded-2xl border border-border p-3 flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-muted inline-flex items-center justify-center text-[18px] shrink-0">
                    {s.source === "reel" ? "🎬" : "📍"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[14px] truncate">{s.placeName}</p>
                    {s.address && (
                      <p className="text-[12px] text-muted-foreground truncate mt-0.5">{s.address}</p>
                    )}
                    {s.rating != null && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground mt-1">
                        <Star size={11} weight="fill" className="text-[color:var(--clr-dune,#E0B252)]" />
                        <span dir="ltr">{s.rating}</span>
                      </span>
                    )}
                  </div>
                  {s.lat != null && s.lng != null && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 w-9 h-9 rounded-xl bg-primary/12 text-primary inline-flex items-center justify-center"
                      aria-label={t("now.openMap")}
                    >
                      <MapPin size={16} weight="fill" />
                    </a>
                  )}
                </li>
              ))}
            </ul>

            <Link
              href={`/trips/${tripId}/discover`}
              className="mt-3 w-full h-11 rounded-2xl border border-border font-semibold text-[13.5px] inline-flex items-center justify-center"
            >
              {t("now.whatsNowMore")}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
