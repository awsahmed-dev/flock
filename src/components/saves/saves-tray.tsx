"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookmarkSimple, CaretDown, CaretRight, Plus, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";
import { planSavedPlace, suggestDayFor, type SavedRow } from "@/lib/actions/saves";

/**
 * The tray on the plan: everything saved for this trip and what became of it.
 *
 * "Every save is a promise to resurface" — a save the app never mentions
 * again teaches people to stop saving, which quietly kills the whole capture
 * loop. So each row carries its fate, and unscheduled ones get a one-tap
 * route into a day (the day is computed, not asked).
 */
export function SavesTray({
  tripId,
  saves,
  days,
}: {
  tripId: string;
  saves: SavedRow[];
  days: string[];
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();

  if (saves.length === 0) return null;
  const waiting = saves.filter((s) => s.status !== "planned");

  function place(save: SavedRow) {
    startTransition(async () => {
      try {
        const s = await suggestDayFor(tripId, { lat: save.lat, lng: save.lng }).catch(() => ({
          day: days[0] ?? null,
          reason: "first" as const,
        }));
        const day = s.day ?? days[0];
        if (!day) return;
        await planSavedPlace(save.id, day);
        const label = new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        toast.success(t("saves.planned", { day: label }));
        router.refresh();
      } catch {
        toast.error(t("saves.failed"));
      }
    });
  }

  return (
    <div className="mb-3 rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-2.5 text-start"
      >
        <BookmarkSimple size={17} weight="fill" className="text-primary shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-[14px]">{t("saves.trayTitle")}</span>
          <span className="block text-[12px] text-muted-foreground">
            {t("saves.traySub", { count: waiting.length })}
          </span>
        </span>
        {open ? <CaretDown size={15} className="text-muted-foreground shrink-0" />
              : <CaretRight size={15} className="text-muted-foreground shrink-0 rtl:rotate-180" />}
      </button>

      {open && (
        <ul className="px-3 pb-3 space-y-2">
          {saves.map((s) => (
            <li key={s.id} className="rounded-xl bg-muted/40 p-2.5 flex items-center gap-2.5">
              <span className="text-[17px] shrink-0">{s.source === "reel" ? "🎬" : "📍"}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[13.5px] truncate">{s.placeName}</span>
                <span
                  className={`inline-block mt-0.5 text-[10.5px] font-bold rounded-full px-2 py-0.5 ${
                    s.status === "planned"
                      ? "bg-[color:var(--clr-moss,#9BC97E)]/15 text-[color:var(--clr-moss,#5E8C3C)]"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {s.status === "planned" ? t("saves.statusPlanned") : t("saves.statusSaved")}
                </span>
              </span>
              {s.status === "planned" ? (
                <CheckCircle size={18} weight="fill" className="text-[color:var(--clr-moss,#5E8C3C)] shrink-0" />
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => place(s)}
                  className="shrink-0 h-11 px-3.5 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-bold inline-flex items-center gap-1"
                >
                  <Plus size={16} /> {t("itinerary.addToDay")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
