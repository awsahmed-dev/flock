"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Check,
  Sparkle as Sparkles,
  Star,
  BookmarkSimple,
  CircleNotch as Loader2,
  CaretRight,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { addPlaceToCity, fillFreeDays, type CityBoard as Board } from "@/lib/actions/city";
import { format } from "@/lib/i18n/date-fns";
import { parseISO } from "date-fns";

/**
 * «وش نسوي في طوكيو؟» — the city layer.
 *
 * The shape decides where you sleep; this decides what you do there. It is
 * scoped to one base on purpose: a trip-wide list of places is a listicle,
 * and a trip-wide "add" has to ask which of thirty days you meant. Inside a
 * city the answer is a handful of days, and once we know where things are,
 * it is none — proximity picks.
 */

const CATEGORIES = ["sight", "food", "nature", "walk", "shop", "rest"] as const;
const CAT_EMOJI: Record<string, string> = {
  sight: "📍", food: "🍽️", nature: "🌿", walk: "🚶", shop: "🛍️", rest: "♨️",
};

export function CityBoard({ tripId, board }: { tripId: string; board: Board }) {
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [cat, setCat] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const available = board.places.filter((p) => !p.inPlan);
  const shown = useMemo(
    () => (cat ? available.filter((p) => p.category === cat) : available),
    [available, cat],
  );
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of available) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [available]);

  function add(key: string) {
    startTransition(async () => {
      try {
        const r = await addPlaceToCity({ tripId, baseId: board.baseId, placeKey: key });
        if (r.already) return;
        const label = format(parseISO(r.day!), "EEE d MMM");
        toast.success(
          r.reason === "near"
            ? t("city.addedNear", { day: label })
            : t("city.added", { day: label }),
        );
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("city.failed"));
      }
    });
  }

  async function fill() {
    setWorking(true);
    try {
      const r = await fillFreeDays(tripId, board.baseId);
      const first = r.days[0];
      toast.success(
        first && first.spreadKm > 0
          ? t("city.filledNear", { count: r.days.length, km: first.spreadKm })
          : t("city.filled", { count: r.days.length }),
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("city.failed"));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="pb-28">
      {/* ── which city, and how much room is left in it ─────────────── */}
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h1 className="text-[22px] font-extrabold leading-tight">{ar ? board.nameAr : board.name}</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {format(parseISO(board.checkIn), "EEE d MMM")} → {format(parseISO(board.checkOut), "EEE d MMM")}
            {" · "}
            {t("shape.nights", { count: board.nights })}
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {board.days.map((d) => (
              <span
                key={d.date}
                title={d.date}
                className={`inline-flex items-center justify-center min-w-11 h-9 px-2 rounded-xl text-[11.5px] font-bold border ${
                  d.travel
                    ? "border-transparent bg-muted text-muted-foreground"
                    : d.free
                      ? "border-dashed border-primary/50 text-primary"
                      : "border-border text-muted-foreground"
                }`}
              >
                {format(parseISO(d.date), "d")}
                <span className="opacity-60 ms-1">{d.travel ? "✈" : d.stops || "·"}</span>
              </span>
            ))}
          </div>
          {board.freeDays > 0 && board.isOwner && (
            <button
              type="button"
              onClick={fill}
              disabled={working || busy}
              className="mt-3 w-full min-h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-[14px] inline-flex items-center justify-center gap-2"
            >
              {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={17} weight="fill" />}
              {t("city.fill", { count: board.freeDays })}
            </button>
          )}
        </div>
      </div>

      {/* ── the other cities on this trip ───────────────────────────── */}
      {board.siblings.length > 0 && (
        <div className="px-4 mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {board.siblings.map((s) => (
            <Link
              key={s.id}
              href={`/trips/${tripId}/city/${s.id}`}
              className="shrink-0 min-h-10 px-3.5 rounded-full border border-border text-[13px] font-semibold inline-flex items-center gap-1.5"
            >
              {ar ? s.nameAr : s.name}
              <CaretRight size={13} className="rtl:rotate-180 opacity-60" />
            </Link>
          ))}
        </div>
      )}

      {/* ── what you could do here ──────────────────────────────────── */}
      <div className="px-4 mt-4 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCat(null)}
          className={`shrink-0 min-h-10 px-3.5 rounded-full text-[13px] font-semibold border ${
            cat === null ? "bg-primary text-primary-foreground border-primary" : "border-border"
          }`}
        >
          {t("city.all")} · {available.length}
        </button>
        {CATEGORIES.filter((c) => counts[c]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`shrink-0 min-h-10 px-3.5 rounded-full text-[13px] font-semibold border inline-flex items-center gap-1.5 ${
              cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border"
            }`}
          >
            <span>{CAT_EMOJI[c]}</span>
            {t(`city.cat_${c}`)} · {counts[c]}
          </button>
        ))}
      </div>

      <ul className="px-4 mt-3 space-y-2">
        {shown.length === 0 && (
          <li className="py-10 text-center text-[13.5px] text-muted-foreground">{t("city.empty")}</li>
        )}
        {shown.map((p) => (
          <li key={p.key} className="rounded-2xl border border-border bg-card p-3 flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-muted inline-flex items-center justify-center text-[18px] shrink-0">
              {p.fromSave ? "🔖" : CAT_EMOJI[p.category] ?? "📍"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[14.5px]">{ar ? p.nameAr : p.name}</span>
                {p.rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    <Star size={11} weight="fill" className="text-[color:var(--clr-dune)]" />
                    <span dir="ltr">{p.rating}</span>
                  </span>
                )}
                {p.fromSave && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full bg-primary/12 text-primary px-2 py-0.5">
                    <BookmarkSimple size={10} weight="fill" /> {t("city.fromSaves")}
                  </span>
                )}
                {/* Said out loud rather than silently filtered, so nobody
                    wonders where a place went. */}
                {p.adultsOnly && board.kids > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full bg-[color:var(--clr-dune)]/15 text-[color:var(--clr-dune)] px-2 py-0.5">
                    <Warning size={10} weight="fill" /> {t("city.notForKids")}
                  </span>
                )}
              </div>
              {(ar ? p.whyAr : p.why) && (
                <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
                  {ar ? p.whyAr : p.why}
                </p>
              )}
            </div>
            {board.isOwner && (
              <button
                type="button"
                disabled={busy}
                onClick={() => add(p.key)}
                aria-label={t("city.add")}
                className="w-11 h-11 shrink-0 rounded-xl border border-border inline-flex items-center justify-center text-primary hover:bg-primary/10"
              >
                <Plus size={17} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* already scheduled, so the list above stays about what's left */}
      {board.places.some((p) => p.inPlan) && (
        <div className="px-4 mt-5">
          <p className="text-[12px] text-muted-foreground mb-2">{t("city.alreadyIn")}</p>
          <div className="flex flex-wrap gap-1.5">
            {board.places
              .filter((p) => p.inPlan)
              .map((p) => (
                <span
                  key={p.key}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5 text-[11.5px] text-muted-foreground"
                >
                  <Check size={11} weight="bold" className="text-[color:var(--clr-moss)]" />
                  {ar ? p.nameAr : p.name}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        <Link
          href={`/trips/${tripId}/itinerary`}
          className="w-full min-h-12 rounded-2xl border border-border font-semibold text-[13.5px] inline-flex items-center justify-center gap-1.5"
        >
          {t("shape.viewDays")}
        </Link>
      </div>
    </div>
  );
}
