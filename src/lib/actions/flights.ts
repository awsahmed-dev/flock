"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, documents, itineraryItems, tripSegments } from "@/lib/db/schema";
import { getBase } from "@/lib/packages/library";
import { isKnownAirport, samePlace } from "@/lib/airports";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "./trips";
import type { Refused } from "./refusal";

/**
 * Flights you can actually change.
 *
 * A flight is the same pair it always was — an anchor stop on the departure
 * day (so it pins to the plan and the Departure Board) plus a `bookings` row
 * — but until now nothing in the app could edit one, the row had no idea
 * where the flight went, and a ticket uploaded to Documents was only ever a
 * picture. So a ticket that changed from KUL→JED to KUL→RUH had no field to
 * change and no way to be re-read.
 *
 * Who may edit: the trip owner, or whoever added the flight. In a group each
 * person often has their own flight; the crew still SEES every one.
 */

async function me() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

export interface Flight {
  stopId: string;
  flightNumber: string | null;
  airline: string | null;
  origin: string | null;
  destination: string | null;
  departDate: string;
  departTime: string | null; // HH:mm
  arriveDate: string | null;
  arriveTime: string | null;
  confirmation: string | null;
  ticketUrl: string | null;
  canEdit: boolean;
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export async function listFlights(tripId: string): Promise<Flight[]> {
  const user = await me();
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  const isOwner = trip.members.some((m) => m.userId === user.id && m.role === "owner");

  const rows = await db
    .select({
      stopId: itineraryItems.id,
      title: itineraryItems.title,
      dayDate: itineraryItems.dayDate,
      startTime: itineraryItems.startTime,
      createdBy: itineraryItems.createdBy,
      flightNumber: bookings.flightNumber,
      airline: bookings.providerName,
      origin: bookings.origin,
      destination: bookings.destination,
      arriveDate: bookings.arriveDate,
      arriveTime: bookings.arriveTime,
      confirmation: bookings.confirmationNumber,
      ticketUrl: bookings.pdfUrl,
    })
    .from(itineraryItems)
    .leftJoin(bookings, eq(bookings.stopId, itineraryItems.id))
    .where(and(eq(itineraryItems.tripId, tripId), eq(itineraryItems.stopType, "booking_flight")));

  return rows
    .map((r) => ({
      stopId: r.stopId,
      // Flights added before the number had its own column carry it in the
      // title ("Saudia — SV 826"); show that rather than nothing.
      flightNumber: r.flightNumber ?? r.title,
      airline: r.airline,
      origin: r.origin,
      destination: r.destination,
      departDate: String(r.dayDate),
      departTime: hhmm(r.startTime as string | null),
      arriveDate: r.arriveDate ? String(r.arriveDate) : null,
      arriveTime: r.arriveTime,
      confirmation: r.confirmation,
      ticketUrl: r.ticketUrl,
      canEdit: isOwner || r.createdBy === user.id,
    }))
    .sort((a, b) => (a.departDate + (a.departTime ?? "")).localeCompare(b.departDate + (b.departTime ?? "")));
}

export interface FlightInput {
  tripId: string;
  stopId?: string | null;
  flightNumber: string;
  airline?: string | null;
  origin?: string | null;
  destination?: string | null;
  departDate: string;
  departTime?: string | null;
  arriveDate?: string | null;
  arriveTime?: string | null;
  confirmation?: string | null;
  ticketUrl?: string | null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const clip = (v: string | null | undefined, n: number) => {
  const t = (v ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, n) : null;
};
/** Airports are shown as codes; a three-letter code is upper-cased, a city left alone. */
const place = (v: string | null | undefined) => {
  const t = clip(v, 60);
  return t && /^[a-z]{3}$/i.test(t) ? t.toUpperCase() : t;
};

/** The stop's title — what the itinerary and Departure Board show. */
function titleFor(f: { flightNumber: string; origin: string | null; destination: string | null }) {
  return f.origin && f.destination ? `${f.flightNumber} · ${f.origin} → ${f.destination}` : f.flightNumber;
}

/** Create a flight, or change one. */
export async function saveFlight(input: FlightInput): Promise<{ ok: true; stopId: string } | Refused> {
  const user = await me();
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  const isOwner = trip.members.some((m) => m.userId === user.id && m.role === "owner");

  const flightNumber = clip(input.flightNumber, 40);
  if (!flightNumber) return { ok: false, error: "flights.errNumber" };
  if (!DATE.test(input.departDate)) return { ok: false, error: "flights.errDate" };
  const departTime = input.departTime && TIME.test(input.departTime) ? input.departTime : null;
  const arriveDate = input.arriveDate && DATE.test(input.arriveDate) ? input.arriveDate : null;
  const arriveTime = input.arriveTime && TIME.test(input.arriveTime) ? input.arriveTime : null;
  if (arriveDate && arriveDate < input.departDate) return { ok: false, error: "flights.errArriveBefore" };

  const origin = place(input.origin);
  const destination = place(input.destination);
  // Only our own storage proxy — never an arbitrary URL rendered as a ticket.
  const ticketUrl =
    input.ticketUrl && input.ticketUrl.startsWith("/api/storage/trip-documents/") ? input.ticketUrl : null;

  const fields = {
    flightNumber,
    providerName: clip(input.airline, 60),
    origin,
    destination,
    arriveDate,
    arriveTime,
    confirmationNumber: clip(input.confirmation, 40),
    pdfUrl: ticketUrl,
  };
  const title = titleFor({ flightNumber, origin, destination });

  if (input.stopId) {
    // authz-2: bookings has no trip_id, so the stop must be proven to belong
    // to THIS trip before its booking row is touched.
    const stop = await db.query.itineraryItems.findFirst({
      columns: { id: true, createdBy: true, stopType: true },
      where: and(eq(itineraryItems.id, input.stopId), eq(itineraryItems.tripId, input.tripId)),
    });
    if (!stop || stop.stopType !== "booking_flight") return { ok: false, error: "flights.errNotFound" };
    if (!isOwner && stop.createdBy !== user.id) return { ok: false, error: "flights.errNotYours" };

    await db
      .update(itineraryItems)
      .set({ title, dayDate: input.departDate, startTime: departTime, updatedAt: new Date() })
      .where(eq(itineraryItems.id, input.stopId));
    const updated = await db.update(bookings).set(fields).where(eq(bookings.stopId, input.stopId)).returning({ id: bookings.id });
    if (updated.length === 0) {
      await db.insert(bookings).values({ stopId: input.stopId, bookingType: "flight", createdBy: user.id, ...fields });
    }
    revalidateTrip(input.tripId);
    return { ok: true, stopId: input.stopId };
  }

  const [stop] = await db
    .insert(itineraryItems)
    .values({
      tripId: input.tripId,
      dayDate: input.departDate,
      title,
      type: "transport",
      startTime: departTime,
      status: "confirmed",
      stopType: "booking_flight",
      sortOrder: -1,
      createdBy: user.id,
      provider: "manual",
    })
    .returning({ id: itineraryItems.id });
  await db.insert(bookings).values({ stopId: stop.id, bookingType: "flight", createdBy: user.id, ...fields });

  revalidateTrip(input.tripId);
  return { ok: true, stopId: stop.id };
}

/** Remove a flight. The ticket file itself stays in Documents. */
export async function removeFlight(tripId: string, stopId: string): Promise<{ ok: true } | Refused> {
  const user = await me();
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  const isOwner = trip.members.some((m) => m.userId === user.id && m.role === "owner");

  const stop = await db.query.itineraryItems.findFirst({
    columns: { id: true, createdBy: true, stopType: true },
    where: and(eq(itineraryItems.id, stopId), eq(itineraryItems.tripId, tripId)),
  });
  if (!stop || stop.stopType !== "booking_flight") return { ok: false, error: "flights.errNotFound" };
  if (!isOwner && stop.createdBy !== user.id) return { ok: false, error: "flights.errNotYours" };

  await db.delete(itineraryItems).where(eq(itineraryItems.id, stopId)); // bookings cascades
  revalidateTrip(tripId);
  return { ok: true };
}

/**
 * File a ticket the flight sheet just uploaded as a Documents row too, so it
 * sits with the trip's other papers and Pocket Day can keep it offline.
 * Only our own storage proxy path is accepted.
 */
export async function addTicketDocument(
  tripId: string,
  url: string,
  title: string,
  dayDate: string | null,
): Promise<{ ok: true } | Refused> {
  const user = await me();
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  if (!url.startsWith("/api/storage/trip-documents/")) return { ok: false, error: "flights.uploadFailed" };
  const exists = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.tripId, tripId), eq(documents.url, url)))
    .limit(1);
  if (exists.length === 0) {
    await db.insert(documents).values({
      tripId,
      type: "flight",
      url,
      title: (title || "Ticket").slice(0, 140),
      dayDate: dayDate && DATE.test(dayDate) ? dayDate : null,
      uploadedBy: user.id,
    });
  }
  revalidatePath(`/trips/${tripId}/huddle`);
  return { ok: true };
}

/**
 * Flight tickets uploaded to Documents that no flight points at yet — the
 * "a picture of a ticket the app can't read" case. The Flights section offers
 * to read each one.
 */
export async function unreadTickets(tripId: string): Promise<{ id: string; title: string; url: string }[]> {
  const user = await me();
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const docs = await db
    .select({ id: documents.id, title: documents.title, url: documents.url })
    .from(documents)
    .where(and(eq(documents.tripId, tripId), eq(documents.type, "flight")));
  if (docs.length === 0) return [];

  const stops = await db
    .select({ id: itineraryItems.id })
    .from(itineraryItems)
    .where(and(eq(itineraryItems.tripId, tripId), eq(itineraryItems.stopType, "booking_flight")));
  const used = stops.length
    ? new Set(
        (await db.select({ url: bookings.pdfUrl }).from(bookings).where(inArray(bookings.stopId, stops.map((s) => s.id))))
          .map((b) => b.url)
          .filter(Boolean),
      )
    : new Set<string | null>();
  return docs.filter((d) => !used.has(d.url));
}

export interface FlightsPanel {
  flights: Flight[];
  unreadTickets: { id: string; title: string; url: string }[];
  tripStart: string;
  tripEnd: string;
  /**
   * The arriving flight lands somewhere the route doesn't start. Only set
   * when BOTH ends are known — an airport we have no names for is never
   * called a mismatch.
   */
  arrivalMismatch: { lands: string; routeStartsEn: string; routeStartsAr: string } | null;
}

/** Everything the Flights section needs, in one round trip. */
export async function loadFlightsPanel(tripId: string): Promise<FlightsPanel> {
  const user = await me();
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const [flights, unread, segs] = await Promise.all([
    listFlights(tripId),
    unreadTickets(tripId),
    db
      .select({ baseId: tripSegments.baseId, customName: tripSegments.customName, customNameAr: tripSegments.customNameAr })
      .from(tripSegments)
      .where(eq(tripSegments.tripId, tripId))
      .orderBy(tripSegments.sortOrder)
      .limit(1),
  ]);

  let arrivalMismatch: FlightsPanel["arrivalMismatch"] = null;
  // The flight that gets you there: the first one leaving by the day after
  // the trip starts (an overnight flight departs the evening before).
  const dayAfterStart = new Date(`${trip.startDate}T00:00:00Z`);
  dayAfterStart.setUTCDate(dayAfterStart.getUTCDate() + 1);
  const cutoff = dayAfterStart.toISOString().slice(0, 10);
  const arriving = flights.find((f) => f.departDate <= cutoff && f.destination);
  const first = segs[0];
  if (arriving?.destination && first && isKnownAirport(arriving.destination)) {
    const custom = first.baseId.startsWith("custom:");
    const base = custom ? null : getBase(first.baseId as never);
    const en = custom ? first.customName ?? first.baseId.slice(7) : base?.name ?? first.baseId;
    const ar = custom ? first.customNameAr ?? first.customName ?? first.baseId.slice(7) : base?.nameAr ?? en;
    if (!samePlace(arriving.destination, [en, ar])) {
      arrivalMismatch = { lands: arriving.destination, routeStartsEn: en, routeStartsAr: ar };
    }
  }

  return { flights, unreadTickets: unread, tripStart: String(trip.startDate), tripEnd: String(trip.endDate), arrivalMismatch };
}

function revalidateTrip(tripId: string) {
  revalidatePath(`/trips/${tripId}/documents`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}`);
}
