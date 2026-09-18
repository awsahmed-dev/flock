"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, CaretRight, Compass, CircleNotch as Loader2, MapTrifold } from "@phosphor-icons/react/dist/ssr";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { adoptRoute, startBlankShape, type RouteCard } from "@/lib/actions/shape";

/**
 * «المسارات» — and the tap that adopts.
 *
 * There is deliberately no draft and no confirm step. A draft is what left
 * people on an empty plan tab when they backed out halfway, which is the
 * state this whole project exists to kill: choose a route and you have a
 * complete trip, immediately. Everything after is an edit to a live plan.
 *
 * The chains are pre-scaled to this trip's real nights before they render,
 * so a curated route reads as built for you without asking anything.
 */
export function RoutesScreen({
  tripId,
  routes,
  destination,
  fallbackBaseId,
  countryOnly = false,
  inCountry = [],
}: {
  tripId: string;
  routes: RouteCard[];
  destination: string;
  fallbackBaseId: string | null;
  /** the destination names a country, so we must ask which city */
  countryOnly?: boolean;
  /** cities we curate in that country, as a shortcut */
  inCountry?: { id: string; name: string; nameAr: string }[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [working, setWorking] = useState<string | null>(null);
  const [city, setCity] = useState("");

  async function startCity(name: string) {
    setWorking("city");
    try {
      await startBlankShape(tripId, null, { name });
      toast.success(t("routes.adopted"));
      router.push(`/trips/${tripId}/shape`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("routes.failed"));
      setWorking(null);
    }
  }

  async function startCurated(baseId: string) {
    setWorking(baseId);
    try {
      await startBlankShape(tripId, baseId);
      toast.success(t("routes.adopted"));
      router.push(`/trips/${tripId}/shape`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("routes.failed"));
      setWorking(null);
    }
  }

  async function choose(routeId: string) {
    setWorking(routeId);
    try {
      const r = await adoptRoute(tripId, routeId);
      if (r.dropped.length) toast.info(t("routes.dropped", { places: (ar ? r.droppedAr : r.dropped).join(t("common.listSep")) }));
      // The card said "Lisbon → Porto" and the plan came out Porto → Lisbon,
      // because the trip already knew which city it lands in. That is the
      // right answer, but it must not arrive without a word — the whole
      // point of the route card is that you get what you tapped.
      if (r.reversed) toast.info(t("shape.gatewayReversed"));
      toast.success(t("routes.adopted"));
      router.push(r.bases > 1 ? `/trips/${tripId}/shape` : `/trips/${tripId}/itinerary`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("routes.failed"));
      setWorking(null);
    }
  }

  async function blank() {
    setWorking("blank");
    try {
      // No curated base is fine — the destination itself becomes one.
      await startBlankShape(tripId, fallbackBaseId, fallbackBaseId ? undefined : { name: destination });
      toast.success(t("routes.adopted"));
      router.push(`/trips/${tripId}/shape`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("routes.failed"));
      setWorking(null);
    }
  }

  /* A country is not a place you sleep.
     Treating one as a stay put "a hotel in Saudi Arabia, 31 nights" on the
     booking list, and left a plan whose only city was a country. So ask,
     rather than invent a city or pretend the country is one. */
  if (countryOnly) {
    return (
      <div className="px-4 py-12">
        <MapTrifold size={40} className="mx-auto text-muted-foreground" />
        <h1 className="mt-4 text-[20px] font-extrabold text-center">
          {t("routes.cityTitle", { place: destination })}
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed max-w-sm mx-auto text-center">
          {t("routes.cityBody")}
        </p>

        <form
          className="mt-6 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = city.trim();
            if (name.length < 2) return;
            startCity(name);
          }}
        >
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("routes.cityPlaceholder")}
            className="flex-1 min-w-0 h-12 rounded-2xl border border-border bg-card px-4 text-[14px]"
          />
          <button
            type="submit"
            disabled={!!working || city.trim().length < 2}
            className="h-12 px-5 rounded-2xl bg-primary text-primary-foreground font-bold text-[14px] disabled:opacity-40 shrink-0"
          >
            {working === "city" ? <Loader2 className="w-4 h-4 animate-spin" /> : t("routes.cityStart")}
          </button>
        </form>

        {/* The cities we curate in that country, if any — a real shortcut
            rather than a list of everything we happen to have. */}
        {inCountry.length > 0 && (
          <>
            <p className="mt-5 text-[12.5px] text-muted-foreground">{t("routes.cityOrPick")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {inCountry.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  disabled={!!working}
                  onClick={() => startCurated(b.id)}
                  className="min-h-11 px-4 rounded-full border border-dashed border-primary/50 text-primary text-[13.5px] font-semibold"
                >
                  {ar ? b.nameAr : b.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  /* Nothing curated here — say so, and point at the thing that does work,
     rather than rendering a chooser that can only refuse. */
  if (routes.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <MapTrifold size={40} className="mx-auto text-muted-foreground" />
        <h1 className="mt-4 text-[20px] font-extrabold">{t("routes.noneTitle", { place: destination })}</h1>
        <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
          {t("routes.noneBodyV2")}
        </p>
        {/* Discover cannot build a plan, so it is no longer the way out of
            an uncurated destination. Start the shape here and fill it. */}
        <button
          type="button"
          onClick={blank}
          disabled={!!working}
          className="mt-6 inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-2xl bg-primary text-primary-foreground font-bold text-[14px]"
        >
          {working === "blank" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass size={17} weight="fill" />}
          {t("routes.startHere", { place: destination })}
        </button>
        <Link
          href={`/trips/${tripId}/discover`}
          className="mt-3 block mx-auto min-h-12 px-5 rounded-2xl border border-border font-semibold text-[13.5px] inline-flex items-center justify-center"
        >
          {t("routes.toSaves")}
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-28">
      <h1 className="text-[22px] font-extrabold">{t("routes.title")}</h1>
      <p className="mt-1.5 text-[13.5px] text-muted-foreground leading-relaxed">{t("routes.lede")}</p>

      <div className="mt-4 space-y-3">
        {routes.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={!!working}
            onClick={() => choose(r.id)}
            className="w-full text-start rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition-colors disabled:opacity-60"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[16.5px] leading-tight">{ar ? r.titleAr : r.title}</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">{ar ? r.subtitleAr : r.subtitle}</p>
              </div>
              {working === r.id ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
              ) : (
                <ArrowRight size={17} className="text-muted-foreground shrink-0 mt-0.5 rtl:rotate-180" />
              )}
            </div>

            {/* the chain, already scaled to THIS trip */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {r.chain.map((c, i) => (
                <span key={`${c.name}-${i}`} className="inline-flex items-center gap-1.5">
                  {/* An SVG caret always renders and mirrors correctly; the
                      text arrow was a blank box in Arabic. */}
                  {i > 0 && (
                    <CaretRight size={11} className="text-muted-foreground shrink-0 rtl:rotate-180" />
                  )}
                  <span className="rounded-full bg-primary/10 text-primary text-[12px] font-bold px-2.5 py-1">
                    {ar ? c.nameAr : c.name}
                    {/* A bare numeral glued to a city name says nothing —
                        nights, a rating, a position in the chain? It needs
                        its noun, and Arabic needs it pluralised properly. */}
                    <span className="opacity-70 font-semibold"> {t("shape.nights", { count: c.nights })}</span>
                  </span>
                </span>
              ))}
            </div>

            {/* The subtitle names the route the way its author wrote it,
                but the chain above is in the order this trip will actually
                be walked. Without this line the card contradicts itself. */}
            {r.reversed && (
              <p className="mt-2 text-[12px] text-[color:var(--clr-dune)] leading-snug">
                {t("shape.gatewayReversed")}
              </p>
            )}

            <p className="mt-2.5 text-[12.5px] text-muted-foreground leading-relaxed">
              {ar ? r.provenanceAr : r.provenance}
            </p>

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold rounded-full bg-muted px-2.5 py-1">
                {ar ? r.forWhoAr : r.forWho}
              </span>
              {r.overflow > 0 && (
                <span className="text-[11px] text-[color:var(--clr-dune)]">
                  {/* These nights ARE allocated now, so "left over" was a
                      flat contradiction of the chain printed right above:
                      "Tokyo 10 › Kyoto 8 › Osaka 7" and "10 nights left
                      over" on a 25-night trip. */}
                  {t("routes.freeDays", { count: r.overflow })}
                </span>
              )}
              {r.dropped.length > 0 && (
                <span className="text-[11px] text-[color:var(--clr-dune)]">
                  {t("routes.dropped", { places: (ar ? r.droppedAr : r.dropped).join(t("common.listSep")) })}
                </span>
              )}
            </div>
          </button>
        ))}

        {fallbackBaseId && (
          <button
            type="button"
            disabled={!!working}
            onClick={blank}
            className="w-full text-start rounded-2xl border border-dashed border-border p-4 hover:border-primary/40 transition-colors"
          >
            <p className="font-bold text-[15px]">{t("routes.blankTitle")}</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t("routes.blankBody")}</p>
          </button>
        )}
      </div>
    </div>
  );
}
