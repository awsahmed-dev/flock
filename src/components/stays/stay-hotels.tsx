"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowSquareOut, Bed, Heart, MapPin, MapTrifold, Star } from "@phosphor-icons/react/dist/ssr";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PoweredByGoogle } from "@/components/discover/primitives";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { togglePlaceLike } from "@/lib/actions/place-likes";
import { createVote } from "@/lib/actions/votes";
import { stayParam } from "@/lib/packages/stay-key";
import { rankHotels, type HotelLite, type RankedHotel } from "@/lib/stays";
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
  eager = false,
}: {
  tripId: string;
  stay: StayView;
  rooms: number;
  crew: number;
  mode: AffiliateMode;
  likes: CrewLikes;
  viewerId: string;
  /** The first open city loads at once — it's on screen when the tab opens. */
  eager?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const city = locale === "ar" ? stay.nameAr : stay.name;
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(eager);
  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [all, setAll] = useState(false);
  const [pending, start] = useTransition();
  const [openHotel, setOpenHotel] = useState<RankedHotel<Hotel> | null>(null);

  // My hearts, optimistic; everyone else's come from the server.
  const [mine, setMine] = useState<Set<string>>(
    () => new Set(Object.entries(likes).filter(([, us]) => us.some((u) => u.userId === viewerId)).map(([id]) => id)),
  );

  useEffect(() => {
    const el = box.current;
    if (!el || seen) return;
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
  }, [seen]);

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

  const pricesHref = (name: string) =>
    `/api/affiliate/stays?trip=${encodeURIComponent(tripId)}&stay=${encodeURIComponent(stayParam(stay.key))}` +
    `&rooms=${rooms}&lang=${locale === "ar" ? "ar" : "en"}&hotel=${encodeURIComponent(name)}`;
  const whereOf = ({ hotel, near, nearestKm }: RankedHotel<Hotel>) =>
    nearestKm == null
      ? shortLocality(hotel.address)
      : near > 0
        ? t("stays.nearStops", { near, total: stay.stops.length })
        : t("stays.kmFromPlan", { km: nf.format(nearestKm) });

  // Nothing to show and nothing coming: no empty box, the card works without it.
  if (failed || (hotels && ranked.length === 0)) return <div ref={box} />;

  return (
    <div ref={box} className="space-y-2">
      <p className="min-h-4 text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {hotels == null
          ? null
          : stay.stops.length === 0
          ? t("stays.hotelsTop", { city })
          : ranked[0]?.near
            ? t("stays.hotelsNearPlan")
            : t("stays.hotelsClosest")}
      </p>

      {hotels == null
        ? [0, 1, 2].map((i) => <div key={i} className="h-[92px] rounded-xl bg-muted/50 animate-pulse" />)
        : shown.map((r) => {
            const { hotel, near } = r;
            const likers = likersOf(hotel.placeId);
            const liked = mine.has(hotel.placeId);
            const where = whereOf(r);
            return (
              <div key={hotel.placeId} className="rounded-xl bg-muted/50 p-2 space-y-2">
                {/* The whole top of the row opens the hotel — photo and name
                    are what people tap, so both are the target. */}
                <button
                  type="button"
                  onClick={() => setOpenHotel(r)}
                  aria-label={t("stays.hotelDetails", { hotel: hotel.name })}
                  className="w-full flex gap-3 text-start rounded-lg active:bg-muted/60"
                >
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
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5 py-0.5">
                    <span className="text-[14px] font-bold leading-snug line-clamp-2" dir="auto">
                      {hotel.name}
                    </span>
                    {hotel.rating != null && (
                      <span className="flex items-center gap-1 text-[12px] text-muted-foreground tabular-nums">
                        <Star className="w-3.5 h-3.5" weight="fill" style={{ color: "var(--clr-dune)" }} />
                        <b className="text-foreground">{nf.format(hotel.rating)}</b>
                        {hotel.userRatingsTotal != null && (
                          <span>· {t("stays.ratings", { count: hotel.userRatingsTotal, n: nf.format(hotel.userRatingsTotal) })}</span>
                        )}
                      </span>
                    )}
                    {where && (
                      <span
                        className="flex items-center gap-1 text-[12px] font-semibold min-w-0"
                        style={{ color: near > 0 ? "var(--clr-wayfind)" : undefined }}
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{where}</span>
                      </span>
                    )}
                    {likers.length > 0 && (
                      <span className="text-[12px] font-semibold truncate" style={{ color: "var(--clr-horizon)" }}>
                        {list.format(likers)}
                      </span>
                    )}
                  </span>
                </button>
                <HotelActions
                  hotel={hotel}
                  liked={liked}
                  onHeart={() => heart(hotel.placeId)}
                  href={mode === "off" ? null : pricesHref(hotel.name)}
                />
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

      <HotelSheet
        open={openHotel}
        where={openHotel ? whereOf(openHotel) : null}
        likers={openHotel ? likersOf(openHotel.hotel.placeId) : []}
        liked={openHotel ? mine.has(openHotel.hotel.placeId) : false}
        onHeart={() => openHotel && heart(openHotel.hotel.placeId)}
        href={openHotel && mode !== "off" ? pricesHref(openHotel.hotel.name) : null}
        onClose={() => setOpenHotel(null)}
      />
    </div>
  );
}

/** Heart + "Prices on Booking.com" — under each row, and in the sheet. */
function HotelActions({
  hotel,
  liked,
  onHeart,
  href,
}: {
  hotel: Hotel;
  liked: boolean;
  onHeart: () => void;
  href: string | null;
}) {
  const t = useT();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onHeart}
        aria-pressed={liked}
        aria-label={t(liked ? "stays.unheart" : "stays.heart", { hotel: hotel.name })}
        className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full border border-border active:bg-muted"
      >
        <Heart
          className="w-5 h-5"
          weight={liked ? "fill" : "regular"}
          style={{ color: liked ? "var(--clr-horizon)" : undefined }}
        />
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="sponsored noopener"
          // Back from the Booking.com tab: pick up "you're checking" and the
          // "did you book it?" question.
          onClick={() => setTimeout(() => router.refresh(), 1500)}
          aria-label={t("stays.pricesFor", { hotel: hotel.name })}
          className="flex-1 min-w-0 h-12 px-4 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center gap-2 text-[14px] font-bold active:scale-[0.98] transition-transform"
        >
          <span className="truncate">{t("stays.pricesOnBooking")}</span>
          <ArrowSquareOut className="w-4 h-4 shrink-0" />
        </a>
      )}
    </div>
  );
}

/**
 * One hotel, bigger: its photos (fetched when opened), rating, address,
 * where it sits against the plan, who in the crew hearted it — and the same
 * two actions as the row, plus Google Maps.
 */
function HotelSheet({
  open,
  where,
  likers,
  liked,
  onHeart,
  href,
  onClose,
}: {
  open: RankedHotel<Hotel> | null;
  where: string | null;
  likers: string[];
  liked: boolean;
  onHeart: () => void;
  href: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const hotel = open?.hotel ?? null;
  const [photos, setPhotos] = useState<{ id: string; refs: string[] } | null>(null);

  useEffect(() => {
    if (!hotel) return;
    let alive = true;
    fetch(`/api/discover/details?id=${encodeURIComponent(hotel.placeId)}&profile=detail`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { place?: { photoRefs?: string[] } } | null) => {
        if (alive && d?.place?.photoRefs?.length) setPhotos({ id: hotel.placeId, refs: d.place.photoRefs.slice(0, 8) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [hotel]);

  const refs =
    hotel && photos?.id === hotel.placeId ? photos.refs : hotel?.photoRef ? [hotel.photoRef] : [];
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { maximumFractionDigits: 1 });
  const list = new Intl.ListFormat(locale === "ar" ? "ar" : "en", { style: "short", type: "conjunction" });
  const maps = hotel
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name)}&query_place_id=${hotel.placeId}`
    : "#";

  return (
    <BottomSheet
      open={hotel != null}
      onClose={onClose}
      title={hotel?.name ?? ""}
      subtitle={where ?? undefined}
      footer={
        hotel && (
          <div className="space-y-2">
            <HotelActions hotel={hotel} liked={liked} onHeart={onHeart} href={href} />
            {href && <p className="text-center text-[11.5px] text-muted-foreground">{t("stays.disclosure")}</p>}
          </div>
        )
      }
    >
      {hotel && (
        <div className="space-y-4 pb-2">
          <div className="-mx-5 flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-none px-5">
            {refs.length > 0 ? (
              refs.map((ref, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- proxied Google photo
                <img
                  key={ref}
                  src={`/api/discover/photo?ref=${encodeURIComponent(ref)}&w=800`}
                  alt={`${hotel.name} ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  className={`${refs.length > 1 ? "w-[85%]" : "w-full"} shrink-0 snap-center aspect-[4/3] rounded-xl object-cover bg-muted`}
                />
              ))
            ) : (
              <div className="w-full aspect-[4/3] rounded-xl bg-muted flex items-center justify-center">
                <Bed className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {hotel.rating != null && (
            <p className="flex items-center gap-1.5 text-[14px] text-muted-foreground tabular-nums">
              <Star className="w-4 h-4" weight="fill" style={{ color: "var(--clr-dune)" }} />
              <b className="text-foreground">{nf.format(hotel.rating)}</b>
              {hotel.userRatingsTotal != null && (
                <span>· {t("stays.ratings", { count: hotel.userRatingsTotal, n: nf.format(hotel.userRatingsTotal) })}</span>
              )}
            </p>
          )}
          {likers.length > 0 && (
            <p className="flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: "var(--clr-horizon)" }}>
              <Heart className="w-4 h-4" weight="fill" />
              {list.format(likers)}
            </p>
          )}
          {hotel.address && (
            <p className="flex items-start gap-1.5 text-[14px] text-muted-foreground" dir="auto">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{hotel.address}</span>
            </p>
          )}
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 rounded-full border border-border inline-flex w-full items-center justify-center gap-2 text-[14px] font-semibold"
          >
            <MapTrifold className="w-4 h-4" />
            {t("stays.openMaps")}
          </a>
          <PoweredByGoogle />
        </div>
      )}
    </BottomSheet>
  );
}
