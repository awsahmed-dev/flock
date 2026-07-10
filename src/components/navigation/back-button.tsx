"use client";

import { ChevronLeft } from "lucide-react";
import { useSmartBack } from "@/lib/use-smart-back";
import { useT } from "@/components/i18n/locale-provider";

/**
 * §5: the app-wide smart back control. When the user reached the page by
 * navigating inside the app it pops one step (router.back); on a cold load it
 * falls back to the dashboard. Two presentations:
 *   - iconOnly: just the chevron (for headers that show the trip name beside it)
 *   - default: chevron + label ("Back" when we can pop, else the cold-load label)
 */
export function BackButton({
  iconOnly = false,
  coldLabel,
  fallback = "/dashboard",
  className,
  iconClassName = "w-5 h-5 rtl:rotate-180",
  labelClassName,
}: {
  iconOnly?: boolean;
  /** Text shown on a cold load (no history). Defaults to "All trips". */
  coldLabel?: string;
  /** §9-D (Phase 6) cold-load destination: trip sub-pages pass
   *  `/trips/[id]`, trip roots keep the default `/dashboard`. */
  fallback?: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}) {
  const t = useT();
  const { canGoBack, goBack } = useSmartBack(fallback);
  const label = canGoBack ? t("common.back") : coldLabel ?? t("nav.allTrips");

  return (
    <button type="button" onClick={goBack} aria-label={label} className={className}>
      <ChevronLeft className={iconClassName} />
      {!iconOnly && <span className={labelClassName}>{label}</span>}
    </button>
  );
}
