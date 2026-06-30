"use client";

import Link from "next/link";
import { useState } from "react";

export type TripStatusTone = "now" | "soon" | "upcoming" | "past";

/**
 * Dashboard trip card (redesign brief Screen A). A destination-matched gradient
 * is ALWAYS the base layer; the photo lays over it and, if the URL is missing or
 * fails to load, we fall back to the gradient (never a dark rectangle — the live
 * bug from the continuation brief §5). Dark bottom gradient keeps the name/dates
 * legible; status chip bottom-right. Two sizes: "full" rail + "memory" past trips.
 */
export function DashboardTripCard({
  href,
  name,
  dates,
  photo,
  gradient,
  status,
  variant = "full",
}: {
  href: string;
  name: string;
  dates: string;
  photo: string | null;
  gradient: string;
  status?: { label: string; tone: TripStatusTone };
  variant?: "full" | "memory";
}) {
  const [imgOk, setImgOk] = useState(true);

  const chipTone: Record<TripStatusTone, string> = {
    now: "bg-success text-black",
    soon: "bg-primary text-white",
    upcoming: "bg-white/20 text-white",
    past: "bg-white/15 text-white/70",
  };

  return (
    <Link
      href={href}
      prefetch
      className={`relative shrink-0 snap-start overflow-hidden rounded-2xl elev-md transition-transform active:scale-[0.98] ${
        variant === "full"
          ? "w-[84vw] max-w-[420px] h-[200px] sm:w-[360px]"
          : "w-[150px] h-[180px]"
      }`}
    >
      {/* Always-present gradient base — the photo lays over it. */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {photo && imgOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={name}
          loading="lazy"
          onError={() => setImgOk(false)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Legibility scrim for the name/dates. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`text-white font-bold leading-tight line-clamp-2 ${
              variant === "full" ? "text-lg" : "text-sm"
            }`}
          >
            {name}
          </p>
          <p className="text-white/70 text-[11px] mt-0.5 tabular-nums">{dates}</p>
        </div>
        {variant === "full" && status && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${chipTone[status.tone]}`}
          >
            {status.label}
          </span>
        )}
      </div>
    </Link>
  );
}
