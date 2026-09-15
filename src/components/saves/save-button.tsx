"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookmarkSimple, Check } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";
import { savePlace, suggestDayFor, planSavedPlace, type SavePlaceInput } from "@/lib/actions/saves";

/**
 * One tap to save. No day picker, ever.
 *
 * The audit's central capture rule: saving is a heartbeat, scheduling is a
 * separate batch verb. A 30-day trip used to answer "I like this café" with
 * thirty day-chips; now the save happens instantly and the day is *offered*
 * in the confirmation toast — one more tap if you want it, zero if you
 * don't. Nothing is lost either way: unscheduled saves live in the tray the
 * package pulls from.
 */
export function SaveButton({
  tripId,
  place,
  compact = false,
  initiallySaved = false,
}: {
  tripId: string | null;
  place: SavePlaceInput;
  compact?: boolean;
  initiallySaved?: boolean;
}) {
  const t = useT();
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    if (busy || saved) return;
    setBusy(true);
    setSaved(true); // optimistic — the gesture must feel instant
    try {
      const { id, duplicate } = await savePlace(tripId, place);
      if (duplicate) {
        toast.info(t("saves.already"));
        return;
      }

      if (!tripId) {
        toast.success(t("saves.toInbox"));
        return;
      }

      // Offer the day. We know where every day of the plan already is, so
      // the app answers its own question instead of asking the user.
      let suggestion: { day: string | null; reason: string } = { day: null, reason: "first" };
      try {
        suggestion = await suggestDayFor(tripId, { lat: place.lat, lng: place.lng });
      } catch {
        /* suggestion is a nicety — never block the save on it */
      }

      if (!suggestion.day) {
        toast.success(t("saves.saved"));
        return;
      }

      const label = new Date(`${suggestion.day}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      toast.success(
        suggestion.reason === "near" ? t("saves.savedNear", { day: label }) : t("saves.saved"),
        {
          duration: 7000,
          action: {
            label: t("saves.putOnDay", { day: label }),
            onClick: async () => {
              try {
                await planSavedPlace(id, suggestion.day!);
                toast.success(t("saves.planned", { day: label }));
              } catch {
                toast.error(t("saves.failed"));
              }
            },
          },
        },
      );
    } catch {
      setSaved(false);
      toast.error(t("saves.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSave}
        aria-label={t("saves.save")}
        className={`w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors ${
          saved ? "bg-primary text-primary-foreground" : "bg-black/45 text-white backdrop-blur"
        }`}
      >
        {saved ? <Check size={17} weight="bold" /> : <BookmarkSimple size={17} weight="bold" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      className={`h-11 px-4 rounded-2xl inline-flex items-center justify-center gap-2 font-bold text-[14px] transition-colors ${
        saved ? "bg-primary/12 text-primary" : "bg-primary text-primary-foreground"
      }`}
    >
      {saved ? <Check size={17} weight="bold" /> : <BookmarkSimple size={17} weight="bold" />}
      {saved ? t("saves.savedShort") : t("saves.save")}
    </button>
  );
}
