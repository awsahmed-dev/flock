export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { WalletBoard } from "@/components/wallet/wallet-board";
import { BookMode } from "@/components/itinerary/book-mode";
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
 * B24: Bookings — combined "what you still need to book" + "what you've
 * already booked" + private items. Replaces the standalone Book mode
 * inside Plan. User mental model: Plan = what you're doing, Bookings =
 * what you're spending on. The "to book" section above shows affiliate
 * CTAs derived from the itinerary; the cards below show parsed/
 * confirmed tickets that landed in the wallet.
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top: 'to book' suggestions derived from the itinerary */}
      <BookMode
        tripId={trip.id}
        destination={trip.destination}
        startDate={trip.startDate as string}
        endDate={trip.endDate as string}
        members={trip.members.length}
        currency={trip.currency}
        locale={locale === "ar" ? "ar" : "en"}
        days={days}
        items={itinRows.map((i) => ({
          id: i.id,
          type: i.type,
          dayDate: i.dayDate,
          title: i.title,
          locationName: i.locationName ?? null,
        }))}
      />

      {/* Below: parsed/confirmed booking cards (Wallet section) */}
      <WalletBoard
        userId={user.id}
        tripName={trip.name}
        destination={trip.destination}
        startDate={trip.startDate as string}
        endDate={trip.endDate as string}
      />
    </div>
  );
}
