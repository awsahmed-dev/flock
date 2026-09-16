"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Compass, CircleNotch as Loader2, MapTrifold } from "@phosphor-icons/react/dist/ssr";
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
}: {
  tripId: string;
  routes: RouteCard[];
  destination: string;
  fallbackBaseId: string | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [working, setWorking] = useState<string | null>(null);

  async function choose(routeId: string) {
    setWorking(routeId);
    try {
      const r = await adoptRoute(tripId, routeId);
      if (r.dropped.length) toast.info(t("routes.dropped", { places: r.dropped.join(t("common.listSep")) }));
      toast.success(t("routes.adopted"));
      router.push(r.bases > 1 ? `/trips/${tripId}/shape` : `/trips/${tripId}/itinerary`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("routes.failed"));
      setWorking(null);
    }
  }

  async function blank() {
    if (!fallbackBaseId) return;
    setWorking("blank");
    try {
      await startBlankShape(tripId, fallbackBaseId);
      toast.success(t("routes.adopted"));
      router.push(`/trips/${tripId}/shape`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("routes.failed"));
      setWorking(null);
    }
  }

  /* Nothing curated here — say so, and point at the thing that does work,
     rather than rendering a chooser that can only refuse. */
  if (routes.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <MapTrifold size={40} className="mx-auto text-muted-foreground" />
        <h1 className="mt-4 text-[20px] font-extrabold">{t("routes.noneTitle", { place: destination })}</h1>
        <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
          {t("routes.noneBody")}
        </p>
        <Link
          href={`/trips/${tripId}/discover`}
          className="mt-6 inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-2xl bg-primary text-primary-foreground font-bold text-[14px]"
        >
          <Compass size={17} weight="fill" /> {t("routes.toSaves")}
        </Link>
        {fallbackBaseId && (
          <button
            type="button"
            onClick={blank}
            disabled={!!working}
            className="mt-3 block mx-auto min-h-12 px-5 rounded-2xl border border-border font-semibold text-[13.5px]"
          >
            {working === "blank" ? <Loader2 className="w-4 h-4 animate-spin" /> : t("routes.blankTitle")}
          </button>
        )}
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
                  {i > 0 && <span className="text-muted-foreground text-[12px]">←</span>}
                  <span className="rounded-full bg-primary/10 text-primary text-[12px] font-bold px-2.5 py-1">
                    {ar ? c.nameAr : c.name}
                    <span className="opacity-70 font-semibold"> {c.nights}</span>
                  </span>
                </span>
              ))}
            </div>

            <p className="mt-2.5 text-[12.5px] text-muted-foreground leading-relaxed">
              {ar ? r.provenanceAr : r.provenance}
            </p>

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold rounded-full bg-muted px-2.5 py-1">
                {ar ? r.forWhoAr : r.forWho}
              </span>
              {r.overflow > 0 && (
                <span className="text-[11px] text-[color:var(--clr-dune)]">
                  {t("routes.overflow", { count: r.overflow })}
                </span>
              )}
              {r.dropped.length > 0 && (
                <span className="text-[11px] text-[color:var(--clr-dune)]">
                  {t("routes.dropped", { places: r.dropped.join(t("common.listSep")) })}
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
