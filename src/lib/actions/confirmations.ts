"use server";

import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { addBooking } from "@/lib/actions/bookings";
import { normalizeParsed, type ParsedConfirmation } from "@/lib/confirmations/types";
import { revalidatePath } from "next/cache";

/**
 * "Add a confirmation" — save what the user confirmed in the preview.
 *
 * For each item: one anchor stop + bookings row (via addBooking, Phase 6 §6),
 * so it pins to its day, shows on the Departure Board, and — next steps —
 * becomes the ticket / horizon plane. If a screenshot/PDF was uploaded, ONE
 * documents row is written (typed by the first item's kind) so the crew can
 * open the original offline; the same file URL is attached to every booking.
 *
 * Dates outside the trip window are still saved (a flight the day before is
 * real) but clamped for the day-pin: before start → start, after end → end.
 */
export async function addConfirmations(input: {
  tripId: string;
  items: ParsedConfirmation[];
  fileUrl?: string | null;
  fileTitle?: string | null;
}): Promise<{ saved: number; stopIds: string[] }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  // Re-normalize server-side — never trust the client's shape.
  const items = input.items.map(normalizeParsed).filter((x): x is ParsedConfirmation => !!x).slice(0, 6);
  if (!items.length) throw new Error("Nothing to save");

  const clampDay = (d: string | null): string => {
    if (!d) return trip.startDate;
    if (d < trip.startDate) return trip.startDate;
    if (d > trip.endDate) return trip.endDate;
    return d;
  };
  const nights = (a: string | null, b: string | null): number | null => {
    if (!a || !b) return null;
    const n = Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
    return n > 0 && n < 90 ? n : null;
  };

  const stopIds: string[] = [];
  for (const it of items) {
    const type = it.kind === "flight" ? "flight" : it.kind === "hotel" ? "stay" : "other";
    const name =
      it.kind === "flight" && it.from && it.to ? `${it.title} · ${it.from} → ${it.to}` :
      it.kind === "train" && it.from && it.to ? `${it.title} · ${it.from} → ${it.to}` :
      it.title;
    const { stopId } = await addBooking({
      tripId: input.tripId,
      type,
      name,
      providerName: it.provider,
      dayDate: clampDay(it.date),
      time: it.time,
      confirmationNumber: it.confirmation,
      nights: it.kind === "hotel" ? nights(it.date, it.endDate) : null,
      pdfUrl: input.fileUrl ?? null,
    });
    stopIds.push(stopId);
  }

  if (input.fileUrl) {
    const first = items[0];
    const docType = first.kind === "flight" ? "flight" : first.kind === "hotel" ? "hotel" : first.kind === "train" ? "transport" : "other";
    await db.insert(documents).values({
      tripId: input.tripId,
      type: docType,
      url: input.fileUrl,
      title: input.fileTitle?.trim() || (items.length > 1 ? `${first.title} +${items.length - 1}` : first.title),
      dayDate: clampDay(first.date),
      uploadedBy: user.id,
    });
  }

  revalidatePath(`/trips/${input.tripId}`);
  revalidatePath(`/trips/${input.tripId}/itinerary`);
  revalidatePath(`/trips/${input.tripId}/huddle`);
  return { saved: items.length, stopIds };
}
