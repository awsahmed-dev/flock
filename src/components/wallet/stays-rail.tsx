"use client";

import { useEffect, useState } from "react";
import { Hotel, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { RatingPill, PriceLevel, PoweredByGoogle } from "@/components/discover/primitives";
import { discoverStays, type StayCard } from "@/lib/actions/discover-stays";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Paxawa v2 — P6 "Stays you'd love" rail on the Bookings page. The discovery
 * brain reaches the booking surface: real Google hotels for the destination,
 * ranked by quality, in the same card language as Discover. Lazy-loaded client
 * side so it never blocks the Bookings render; a Google Maps deep-link lets the
 * user jump straight to the listing to book.
 */
export function StaysRail({ tripId, destination }: { tripId: string; destination: string }) {
  const t = useT();
  const [stays, setStays] = useState<StayCard[] | null>(null);

  useEffect(() => {
    let alive = true;
    discoverStays(tripId)
      .then((r) => alive && setStays(r.stays))
      .catch(() => alive && setStays([]));
    return () => { alive = false; };
  }, [tripId]);

  // Nothing found (or errored) → render nothing rather than an empty shell.
  if (stays !== null && stays.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Hotel className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm leading-tight">{t("bookings.staysTitle")}</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {t("bookings.staysSubtitle", { destination })}
            </p>
          </div>
        </div>
        <PoweredByGoogle className="shrink-0" />
      </div>

      {stays === null ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("bookings.staysLoading")}
        </div>
      ) : (
        <div className="-mx-1 px-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-3 pb-1">
            {stays.map((s) => (
              <StayCardItem key={s.placeId} stay={s} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StayCardItem({ stay }: { stay: StayCard }) {
  const t = useT();
  const photo = stay.photoRef
    ? `/api/discover/photo?ref=${encodeURIComponent(stay.photoRef)}&w=500`
    : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.name)}&query_place_id=${stay.placeId}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group shrink-0 w-[220px] rounded-2xl ring-1 ring-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={stay.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-muted-foreground/40">
            {stay.name.charAt(0)}
          </div>
        )}
        <span className="absolute top-2 end-2 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur text-white px-2 py-1 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-3 h-3" />
          {t("bookings.staysView")}
        </span>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="font-bold text-[13px] leading-snug line-clamp-1">{stay.name}</p>
        <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
          <RatingPill rating={stay.rating} reviews={stay.userRatingsTotal} />
          <PriceLevel level={stay.priceLevel} className="text-xs" />
        </div>
        {stay.address && (
          <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">{stay.address}</span>
          </p>
        )}
      </div>
    </a>
  );
}
