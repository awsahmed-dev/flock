"use client";

import { useEffect, useState } from "react";
import { X, Star, ArrowSquareOut, CircleNotch as Loader2 } from "@phosphor-icons/react/dist/ssr";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { placeInfo, type PlaceInfo } from "@/lib/actions/place-info";

/**
 * What a place actually looks like, and what people said about it.
 *
 * "We travellers like places based on images and rating and reviews." A
 * name and one line of our prose is not enough to judge somewhere you have
 * never been — which was the original complaint about this whole corpus.
 * All three come from Google; none of it is written here.
 *
 * When the Places API is not configured the sheet says so plainly instead
 * of rendering an empty shell that looks like the place has no reviews.
 */
export function PlaceInfoSheet({
  placeId,
  fallbackName,
  fallbackWhat,
  fallbackWhy,
  fallbackPhoto,
  onClose,
  onAdd,
  canAdd,
}: {
  placeId: string | null;
  fallbackName: string;
  fallbackWhat?: string | null;
  fallbackWhy?: string | null;
  fallbackPhoto?: string | null;
  onClose: () => void;
  onAdd?: () => void;
  canAdd?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [info, setInfo] = useState<PlaceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setInfo(null);
    if (!placeId) {
      setLoading(false);
      return;
    }
    placeInfo(placeId, locale)
      .then((r) => live && setInfo(r))
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [placeId, locale]);

  const photos = info?.photos?.length ? info.photos : fallbackPhoto ? [fallbackPhoto] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative w-full max-h-[86vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border pb-[calc(env(safe-area-inset-bottom,0)+1rem)]">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur px-4 pt-3 pb-2 flex items-start gap-2 border-b border-border/60">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-extrabold leading-tight">{info?.name ?? fallbackName}</h2>
            {(info?.rating ?? null) != null && (
              <span className="mt-1 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground">
                <Star size={13} weight="fill" className="text-[color:var(--clr-dune)]" />
                <span dir="ltr" className="tabular-nums font-semibold text-foreground">
                  {info!.rating}
                </span>
                {info!.ratingCount ? (
                  <span dir="ltr" className="tabular-nums">
                    ({info!.ratingCount.toLocaleString(ar ? "ar" : "en")})
                  </span>
                ) : null}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="w-11 h-11 -me-1 shrink-0 inline-flex items-center justify-center rounded-full text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* pictures first — it is the first thing anyone judges */}
        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 snap-x">
            {photos.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                loading="lazy"
                className="h-44 w-[74%] shrink-0 snap-start rounded-2xl object-cover bg-muted"
              />
            ))}
          </div>
        )}

        <div className="px-4 pt-3 space-y-3">
          {(fallbackWhat || info?.summary) && (
            <p className="text-[13.5px] text-foreground/80 leading-snug">
              {fallbackWhat || info?.summary}
            </p>
          )}
          {fallbackWhy && (
            <p className="text-[13px] text-muted-foreground italic leading-relaxed">💡 {fallbackWhy}</p>
          )}
          {info?.address && (
            <p className="text-[12.5px] text-muted-foreground leading-snug">{info.address}</p>
          )}
          {info?.openNow && (
            <p className="text-[12.5px] font-semibold text-[color:var(--clr-moss)]">{info.openNow}</p>
          )}

          {loading && (
            <p className="py-6 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline" />
            </p>
          )}

          {/* what people said */}
          {!loading && info?.reviews?.length ? (
            <div className="pt-1 space-y-2.5">
              <p className="text-[12px] font-semibold text-muted-foreground">{t("city.reviews")}</p>
              {info.reviews.map((r, i) => (
                <div key={i} className="rounded-2xl border border-border p-3">
                  <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    {r.rating != null && (
                      <>
                        <Star size={11} weight="fill" className="text-[color:var(--clr-dune)]" />
                        <span dir="ltr" className="tabular-nums">{r.rating}</span>
                      </>
                    )}
                    <span className="truncate">{r.author}</span>
                    {r.when && <span className="ms-auto shrink-0">{r.when}</span>}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed line-clamp-5">{r.text}</p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Say why there is nothing, rather than look like a place with
              no photos and no reviews. */}
          {!loading && !info && (
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              {t("city.noGoogleInfo")}
            </p>
          )}

          <div className="pt-1 flex flex-col gap-2">
            {canAdd && onAdd && (
              <button
                type="button"
                onClick={onAdd}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-[14.5px]"
              >
                {t("city.add")}
              </button>
            )}
            {info?.mapsUrl && (
              <a
                href={info.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-2xl border border-border font-semibold text-[13.5px] inline-flex items-center justify-center gap-2"
              >
                <ArrowSquareOut size={15} className="rtl:-scale-x-100" /> {t("city.openInMaps")}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
