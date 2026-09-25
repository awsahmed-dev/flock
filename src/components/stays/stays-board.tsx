"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowSquareOut, Bed, CheckCircle, Eye, Minus, Plus } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { stayParam } from "@/lib/packages/stay-key";
import { defaultRooms } from "@/lib/stays";
import { dismissStayPrompt, markStayBooked } from "@/lib/actions/stays";
import { refused } from "@/lib/actions/refusal";
import type { StayView } from "@/lib/stays-server";
import type { AffiliateMode } from "@/lib/affiliate/partners";

/**
 * Stays — one card per city you sleep in. See docs/design/sawia-stays/.
 *
 * The button opens Booking.com in a new tab through /api/affiliate/stays,
 * which logs the tap and marks the stay "looking". When this tab becomes
 * visible again the page refreshes, so "did you book it?" is waiting on
 * return — Booking.com never tells Sawia, so asking is the only way to know.
 */
export function StaysBoard({
  tripId,
  stays,
  crew,
  mode,
  notice,
}: {
  tripId: string;
  stays: StayView[];
  crew: number;
  mode: AffiliateMode;
  notice: "busy" | "notlive" | null;
}) {
  const t = useT();
  const router = useRouter();

  // Back from the Booking.com tab: pick up the new "looking" state and the
  // question that comes with it.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const asks = stays.filter((s) => s.askMe);
  const open = stays.filter((s) => !s.coveredBy).length;

  return (
    <div className="space-y-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
      <PageHeader
        backHref={`/trips/${tripId}`}
        title={t("stays.title")}
        subtitle={
          stays.length === 0
            ? t("stays.subtitle")
            : open === 0
              ? t("stays.allCovered")
              : t("stays.openCount", { count: open })
        }
      />

      {notice && (
        <p className="rounded-2xl border border-border bg-card p-3.5 text-[13px] text-muted-foreground">
          {t(notice === "busy" ? "stays.noticeBusy" : "stays.noticeNotLive")}
        </p>
      )}

      {asks.map((s) => (
        <AskBooked key={`ask-${s.key}-${s.checkIn}`} tripId={tripId} stay={s} />
      ))}

      {stays.length === 0 ? (
        <Link
          href={`/trips/${tripId}/shape`}
          className="block rounded-2xl border border-dashed border-border bg-card p-4"
        >
          <span className="block text-[15px] font-semibold">{t("stays.noRoute")}</span>
          <span className="block text-[13px] text-muted-foreground mt-0.5">{t("stays.noRouteCta")}</span>
        </Link>
      ) : (
        stays.map((s) => <StayCard key={`${s.key}-${s.checkIn}`} tripId={tripId} stay={s} crew={crew} mode={mode} />)
      )}
    </div>
  );
}

/** "6–11 Oct", or "11 Oct – 5 Nov" across a month. */
function rangeLabel(checkIn: string, checkOut: string) {
  const a = parseDateOnly(checkIn);
  const b = parseDateOnly(checkOut);
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${format(a, "d")}–${format(b, "d MMM")}`
    : `${format(a, "d MMM")} – ${format(b, "d MMM")}`;
}

function useCity(s: StayView) {
  const { locale } = useLocale();
  return locale === "ar" ? s.nameAr : s.name;
}

function StayCard({ tripId, stay, crew, mode }: { tripId: string; stay: StayView; crew: number; mode: AffiliateMode }) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const city = useCity(stay);
  const [rooms, setRooms] = useState(defaultRooms(crew));
  const covered = stay.coveredBy != null;
  const state: "done" | "look" | "need" = covered ? "done" : stay.looking ? "look" : "need";
  const tone = state === "done" ? "var(--clr-moss)" : state === "look" ? "var(--clr-dune)" : "var(--clr-wayfind)";
  const dim = state === "done" ? "var(--clr-moss-dim)" : state === "look" ? "var(--clr-dune-dim)" : "var(--clr-wayfind-dim)";
  const Icon = state === "done" ? CheckCircle : state === "look" ? Eye : Bed;

  const href =
    `/api/affiliate/stays?trip=${encodeURIComponent(tripId)}` +
    `&stay=${encodeURIComponent(stayParam(stay.key))}&rooms=${rooms}&lang=${locale === "ar" ? "ar" : "en"}`;

  return (
    <section
      className="rounded-2xl border bg-card p-4 space-y-3"
      style={{ borderColor: state === "need" ? "var(--border)" : `color-mix(in srgb, ${tone} 35%, transparent)` }}
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: dim }}>
          <Icon className="w-5 h-5" style={{ color: tone }} weight={state === "done" ? "fill" : "regular"} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-extrabold truncate">{city}</h2>
          <p className="text-[12.5px] text-muted-foreground tabular-nums">
            {/* Not dir="ltr": that holds for English month names, but with
                Arabic ones the bidi algorithm reorders the pieces so the
                month lands before its own day number. An isolated range in
                the page's own direction, with a neutral dash rather than an
                arrow whose meaning flips with direction, reads right in both. */}
            <bdi>{rangeLabel(stay.checkIn, stay.checkOut)}</bdi>
            {" · "}
            {t("stays.nights", { count: stay.nights })} · {t("stays.adults", { count: Math.max(1, crew) })}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider"
          style={{ background: dim, color: tone }}
        >
          {t(state === "done" ? "stays.covered" : state === "look" ? "stays.looking" : "stays.need")}
        </span>
      </div>

      {covered ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
          <Bed className="w-4 h-4 shrink-0" style={{ color: tone }} />
          <span className="flex-1 min-w-0 text-[14px] font-bold truncate" dir="auto">{stay.coveredBy}</span>
        </div>
      ) : (
        <>
          {stay.coveredNights > 0 && (
            <p className="text-[12.5px] text-muted-foreground">
              {t("stays.partial", { covered: stay.coveredNights, nights: t("stays.nights", { count: stay.nights }) })}
            </p>
          )}

          {stay.looking && (
            <p className="text-[13px] font-semibold" style={{ color: tone }}>
              {stay.looking.mine ? t("stays.youLooking") : t("stays.otherLooking", { name: stay.looking.name })}
            </p>
          )}

          {mode === "off" ? (
            // "Nobody's claimed it" would contradict the line above when
            // someone is already looking — say it only when it's true.
            !stay.looking && (
              <p className="rounded-xl border border-dashed border-border px-3 py-3 text-[13px] text-muted-foreground">
                {t("stays.offReminder")}
              </p>
            )
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 ps-3 pe-1.5 py-1.5">
                <span className="text-[13px] font-semibold text-muted-foreground">{t("stays.rooms")}</span>
                <span className="flex items-center">
                  <button
                    type="button"
                    aria-label={t("stays.fewerRooms")}
                    onClick={() => setRooms((r) => Math.max(1, r - 1))}
                    className="w-11 h-11 flex items-center justify-center rounded-full active:bg-muted"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <b className="min-w-7 text-center tabular-nums">{rooms}</b>
                  <button
                    type="button"
                    aria-label={t("stays.moreRooms")}
                    onClick={() => setRooms((r) => Math.min(10, r + 1))}
                    className="w-11 h-11 flex items-center justify-center rounded-full active:bg-muted"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </span>
              </div>
              <a
                href={href}
                target="_blank"
                rel="sponsored noopener"
                onClick={() => {
                  // The route marks the stay "looking"; show it here too.
                  setTimeout(() => router.refresh(), 1500);
                }}
                className={`w-full h-12 rounded-full inline-flex items-center justify-center gap-2 text-[14px] font-bold active:scale-[0.98] transition-transform ${
                  stay.looking ? "border border-border text-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                {t(stay.looking ? (stay.looking.mine ? "stays.ctaAgain" : "stays.ctaAlso") : "stays.cta")}
                <ArrowSquareOut className="w-4 h-4" />
              </a>
              <p className="text-center text-[11.5px] text-muted-foreground">{t("stays.disclosure")}</p>
            </>
          )}
        </>
      )}
    </section>
  );
}

function AskBooked({ tripId, stay }: { tripId: string; stay: StayView }) {
  const t = useT();
  const router = useRouter();
  const city = useCity(stay);
  const [naming, setNaming] = useState(false);
  const [hotel, setHotel] = useState("");
  const [pending, start] = useTransition();

  const yes = () =>
    start(async () => {
      const r = await markStayBooked({ tripId, stayKey: stay.key, checkIn: stay.checkIn, hotelName: hotel });
      if (refused(r)) {
        toast.error(t(r.error));
        return;
      }
      toast.success(t("stays.bookedToast", { city }));
      router.refresh();
    });
  const notYet = () =>
    start(async () => {
      await dismissStayPrompt({ tripId, stayKey: stay.key, checkIn: stay.checkIn });
      router.refresh();
    });

  return (
    <section
      className="rounded-2xl border p-4 space-y-3"
      style={{ background: "var(--clr-dune-dim)", borderColor: "color-mix(in srgb, var(--clr-dune) 35%, transparent)" }}
    >
      <div>
        <p className="text-[15px] font-bold">{t("stays.askTitle", { city })}</p>
        {/* The dates, always: a route can visit the same city twice, and two
            identical "…in Jeddah?" questions can't be told apart. */}
        <p className="text-[12.5px] text-muted-foreground tabular-nums">
          <bdi>{rangeLabel(stay.checkIn, stay.checkOut)}</bdi> · {t("stays.nights", { count: stay.nights })}
        </p>
      </div>
      {naming ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            yes();
          }}
        >
          <input
            autoFocus
            value={hotel}
            onChange={(e) => setHotel(e.target.value)}
            placeholder={t("stays.askHotelPh")}
            maxLength={140}
            dir="auto"
            className="flex-1 min-w-0 rounded-xl border border-border bg-card px-3 h-12 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={pending || !hotel.trim()}
            className="h-12 px-4 rounded-full font-bold disabled:opacity-50"
            style={{ background: "var(--clr-dune)", color: "var(--background)" }}
          >
            {t("common.save")}
          </button>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setNaming(true)}
            className="flex-1 h-11 rounded-full font-bold disabled:opacity-50"
            style={{ background: "var(--clr-dune)", color: "var(--background)" }}
          >
            {t("stays.askYes")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={notYet}
            className="flex-1 h-11 rounded-full border border-border font-semibold disabled:opacity-50"
          >
            {t("stays.askNo")}
          </button>
        </div>
      )}
    </section>
  );
}
