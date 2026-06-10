export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { BookingsBoard } from "@/components/wallet/bookings-board";
import { getLocale } from "@/lib/i18n";
import { db } from "@/lib/db";
import { itineraryItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { eachDayOfInterval } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { format } from "@/lib/i18n/date-fns";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * B24-followup: unified Bookings page. The previous version just stacked
 * <BookMode /> + <WalletBoard /> which gave the page two competing
 * headers, two duplicated max-w containers, and no shared spend metric.
 * The whole page is now owned by <BookingsBoard>, which renders one
 * trip-context header, one big spend tile, and an accordion of "Still
 * to book" + "Booked" sections so the user sees the bookings flow as
 * one continuous surface.
 */
export default async function WalletPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const locale = await getLocale();
  const itinRows = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, id))
    .orderBy(asc(itineraryItems.dayDate), asc(itineraryItems.sortOrder));

  const days = eachDayOfInterval({
    start: parseDateOnly(trip.startDate as string),
    end: parseDateOnly(trip.endDate as string),
  }).map((d) => format(d, "yyyy-MM-dd"));

  return (
    <BookingsBoard
      tripId={trip.id}
      tripName={trip.name}
      destination={trip.destination}
      startDate={trip.startDate as string}
      endDate={trip.endDate as string}
      members={trip.members.length}
      currency={trip.currency}
      locale={locale === "ar" ? "ar" : "en"}
      userId={user.id}
      days={days}
      items={itinRows.map((i) => ({
        id: i.id,
        type: i.type,
        dayDate: i.dayDate,
        title: i.title,
        locationName: i.locationName ?? null,
      }))}
    />
  );
}
