"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowSquareOut, Bed, Heart, MapPin, Star } from "@phosphor-icons/react/dist/ssr";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { togglePlaceLike } from "@/lib/actions/place-likes";
import { createVote } from "@/lib/actions/votes";
import { stayParam } from "@/lib/packages/stay-key";
import { rankHotels, type HotelLite } from "@/lib/stays";
import { shortLocality } from "@/lib/places/short-locality";
import type { CrewLikes, StayView } from "@/lib/stays-server";
import type { AffiliateMode } from "@/lib/affiliate/partners";

interface Hotel extends HotelLite {
  photoRef: string | null;
  address: string | null;
}

const FIRST = 3;
const MOST = 8;

/**
 * Hotels inside a stay's card — Google Places, ranked against the plan's
 * stops for these nights. Booking.com's own list and prices need its API
 * (Managed Affiliate Partner); until then each row opens that hotel on
 * Booking.com with the dates and rooms filled in. See
 * docs/design/sawia-stays/connected.html.
 *
 * Loads when the card scrolls into view: a trip with four cities shouldn't
 * pay for four hotel searches nobody looks at.
 */
export function StayHotels({
  tripId,
  stay,
  rooms,
  crew,
  mode,
  likes,
  viewerId,
}: {
  tripId: string;
  stay: StayView;
  rooms: number;
  crew: number;
  mode: AffiliateMode;
  likes: CrewLikes;
  viewerId: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const city = locale === "ar" ? stay.nameAr : stay.name;
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [all, setAll] = useState(false);
  const [pending, start] = useTransition();

  // My hearts, optimistic; everyone else's come from the server.
  const [mine, setMine] = useState<Set<string>>(
    () => new Set(Object.entries(likes).filter(([, us]) => us.some((u) => u.userId === viewerId)).map(([id]) => id)),
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A string, so a router.refresh() (new arrays, same place) doesn't search again.
  const centerKey = stay.center ? stay.center.join(",") : "";
  useEffect(() => {
    if (!seen) return;
    let alive = true;
    const p = new URLSearchParams({ destination: stay.name, category: "stay" });
    if (centerKey) {
      const [lng, lat] = centerKey.split(",");
      p.set("lng", lng);
      p.set("lat", lat);
    }
    fetch(`/api/discover/feed?${p}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { places?: Hotel[] }) => {
        if (alive) setHotels(d.places ?? []);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [seen, stay.name, centerKey]);

  const ranked = useMemo(() => (hotels ? rankHotels(hotels, stay.stops) : []), [hotels, stay.stops]);
  const shown = ranked.slice(0, all ? MOST : FIRST);

  const likersOf = (placeId: string) => {
    const others = (likes[placeId] ?? []).filter((u) => u.userId !== viewerId).map((u) => u.name || "?");
    return mine.has(placeId) ? [t("stays.you"), ...others] : others;
  };
  const hearted = ranked.filter((r) => likersOf(r.hotel.placeId).length > 0).slice(0, 5);

  const heart = (placeId: string) => {
    const was = mine.has(placeId);
    setMine((s) => {
      const n = new Set(s);
      if (was) n.delete(placeId);
      else n.add(placeId);
      return n;
    });
    togglePlaceLike(tripId, placeId).catch(() => {
      setMine((s) => {
        const n = new Set(s);
        if (was) n.add(placeId);
        else n.delete(placeId);
        return n;
      });
      toast.error(t("stays.heartFailed"));
    });
  };

  const putToVote = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("tripId", tripId);
      fd.set("question", t("stays.voteQuestion", { city }));
      hearted.forEach((r, i) => fd.set(`option_label_${i}`, r.hotel.name));
      try {
        await createVote(fd);
        router.push(`/trips/${tripId}/votes`);
      } catch {
        toast.error(t("stays.voteFailed"));
      }
    });

  const list = new Intl.ListFormat(locale === "ar" ? "ar" : "en", { style: "short", type: "conjunction" });
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { maximumFractionDigits: 1 });

  // Nothing to show and nothing coming: no empty box, the card works without it.
  if (failed || (hotels && ranked.length === 0)) return <div ref={box} />;

  return (
    <div ref={box} className="space-y-2">
      <p className="text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {stay.stops.length === 0
          ? t("stays.hotelsTop", { city })
          : ranked[0]?.near
            ? t("stays.hotelsNearPlan")
            : t("stays.hotelsClosest")}
      </p>

      {hotels == null
        ? [0, 1, 2].map((i) => <div key={i} className="h-[92px] rounded-xl bg-muted/50 animate-pulse" />)
        : shown.map(({ hotel, near, nearestKm }) => {
            const likers = likersOf(hotel.placeId);
            const liked = mine.has(hotel.placeId);
            const where =
              nearestKm == null
                ? shortLocality(hotel.address)
                : near > 0
                  ? t("stays.nearStops", { near, total: stay.stops.length })
                  : t("stays.kmFromPlan", { km: nf.format(nearestKm) });
            const href =
              `/api/affiliate/stays?trip=${encodeURIComponent(tripId)}&stay=${encodeURIComponent(stayParam(stay.key))}` +
              `&rooms=${rooms}&lang=${locale === "ar" ? "ar" : "en"}&hotel=${encodeURIComponent(hotel.name)}`;
            return (
              <div key={hotel.placeId} className="flex gap-3 rounded-xl bg-muted/50 p-2">
                <div className="relative w-[76px] h-[92px] shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                  <Bed className="w-6 h-6 text-muted-foreground" />
                  {hotel.photoRef && (
                    // eslint-disable-next-line @next/next/no-img-element -- proxied Google photo, sized by the proxy
                    <img
                      src={`/api/discover/photo?ref=${encodeURIComponent(hotel.photoRef)}&w=200`}
                      alt=""
                      loading="lazy"
                      // A photo Google won't serve leaves the plain tile, not a broken image.
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-start gap-1">
                    <p className="flex-1 min-w-0 text-[14px] font-bold leading-snug line-clamp-2" dir="auto">
                      {hotel.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => heart(hotel.placeId)}
                      aria-pressed={liked}
                      aria-label={t(liked ? "stays.unheart" : "stays.heart", { hotel: hotel.name })}
                      className="-mt-2 -me-2 w-11 h-11 shrink-0 flex items-center justify-center rounded-full active:bg-muted"
                    >
                      <Heart
                        className="w-5 h-5"
                        weight={liked ? "fill" : "regular"}
                        style={{ color: liked ? "var(--clr-horizon)" : undefined }}
                      />
                    </button>
                  </div>
                  {hotel.rating != null && (
                    <p className="flex items-center gap-1 text-[12px] text-muted-foreground tabular-nums">
                      <Star className="w-3.5 h-3.5" weight="fill" style={{ color: "var(--clr-dune)" }} />
                      <b className="text-foreground">{nf.format(hotel.rating)}</b>
                      {hotel.userRatingsTotal != null && (
                        <span>· {t("stays.ratings", { count: hotel.userRatingsTotal, n: nf.format(hotel.userRatingsTotal) })}</span>
                      )}
                    </p>
                  )}
                  {where && (
                    <p
                      className="flex items-center gap-1 text-[12px] font-semibold truncate"
                      style={{ color: near > 0 ? "var(--clr-wayfind)" : undefined }}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{where}</span>
                    </p>
                  )}
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <p className="min-w-0 text-[12px] font-semibold truncate" style={{ color: "var(--clr-horizon)" }}>
                      {likers.length > 0 && list.format(likers)}
                    </p>
                    {mode !== "off" && (
                      <a
                        href={href}
                        target="_blank"
                        rel="sponsored noopener"
                        onClick={() => setTimeout(() => router.refresh(), 1500)}
                        aria-label={t("stays.pricesFor", { hotel: hotel.name })}
                        className="shrink-0 h-9 px-3 rounded-full border border-border inline-flex items-center gap-1.5 text-[12.5px] font-bold active:scale-[0.97] transition-transform"
                      >
                        {t("stays.prices")}
                        <ArrowSquareOut className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

      {hotels != null && ranked.length > FIRST && !all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="w-full h-11 rounded-full text-[13px] font-bold text-primary"
        >
          {t("stays.showMore", { count: Math.min(MOST, ranked.length) - FIRST })}
        </button>
      )}

      {crew > 1 && hearted.length >= 2 && (
        <button
          type="button"
          disabled={pending}
          onClick={putToVote}
          className="w-full h-12 rounded-full border border-border text-[14px] font-bold disabled:opacity-50"
        >
          {t("stays.voteHearted", { count: hearted.length })}
        </button>
      )}

      {hotels != null && <p className="text-[11px] text-muted-foreground">{t("stays.fromGoogle")}</p>}
    </div>
  );
}
