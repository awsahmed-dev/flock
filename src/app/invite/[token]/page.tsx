export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { tripInvites, tripMembers, profiles, itineraryItems } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { JoinTripForm } from "@/components/trips/join-trip-form";
import { InvitePreviewActions } from "@/components/trips/invite-preview";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { differenceInDays } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * Trip invite landing (redesign brief Screen G). The first thing an invited
 * person sees: full-bleed destination photo, who invited them, the crew, a
 * non-interactive mini map + a plan preview, and one clear "Join the trip" CTA.
 * No raw invite URL anywhere. The join logic (auth-aware) is preserved.
 */
export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const invite = await db.query.tripInvites.findFirst({
    where: eq(tripInvites.token, token),
    with: { trip: true },
  });

  if (!invite) return <InviteEmpty kind="invalid" />;
  if (invite.expiresAt && new Date() > invite.expiresAt) {
    return <InviteEmpty kind="expired" />;
  }

  const trip = invite.trip;
  const days =
    differenceInDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate)) + 1;

  // §10.3: join profiles so the live display name wins over the join-time
  // cached copy on trip_members.
  const memberRows = await db
    .select({
      cachedName: tripMembers.displayName,
      profileName: profiles.displayName,
      role: tripMembers.role,
    })
    .from(tripMembers)
    .leftJoin(profiles, eq(profiles.id, tripMembers.userId))
    .where(eq(tripMembers.tripId, invite.tripId));
  const members = memberRows.map((m) => ({
    displayName: m.profileName || m.cachedName,
    role: m.role,
  }));

  const inviter = await db.query.profiles.findFirst({
    where: eq(profiles.id, invite.createdBy),
    columns: { displayName: true },
  });

  // Plan preview + mini-map center from the itinerary.
  const items = await db
    .select({
      title: itineraryItems.title,
      lat: itineraryItems.locationLat,
      lng: itineraryItems.locationLng,
    })
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, invite.tripId))
    .orderBy(asc(itineraryItems.sortOrder))
    .limit(12);

  const planPreview = items.map((i) => i.title).slice(0, 3);
  const mapPin = items.find((i) => i.lat != null && i.lng != null);
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const staticMapUrl =
    mapPin && mapToken
      ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+6b5ce7(${mapPin.lng},${mapPin.lat})/${mapPin.lng},${mapPin.lat},10,0/640x280@2x?access_token=${mapToken}`
      : null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const existing = await db.query.tripMembers.findFirst({
      where: and(
        eq(tripMembers.tripId, invite.tripId),
        eq(tripMembers.userId, user.id),
      ),
    });
    if (existing) redirect(`/trips/${invite.tripId}`);
  }

  const inviterName = inviter?.displayName ?? "Someone";
  const dateLabel = `${format(parseDateOnly(trip.startDate), "d MMM")} – ${format(parseDateOnly(trip.endDate), "d MMM yyyy")}`;

  return (
    <div className="relative min-h-svh flex flex-col items-center justify-center px-4 py-10 overflow-hidden">
      {/* Full-bleed destination photo + dark overlay. */}
      {trip.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trip.heroImageUrl}
          alt={trip.destination}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/60" />
      )}
      <div className="absolute inset-0 bg-black/60" />

      {/* Logo top-center. */}
      <div className="absolute top-6 inset-x-0 flex justify-center">
        <div className="text-white">
          <Logo variant="full" size="sm" />
        </div>
      </div>

      {/* Center card. */}
      <div className="relative w-full max-w-md rounded-3xl bg-card text-card-foreground elev-lg p-6 mt-8">
        {/* Inviter */}
        <div className="flex items-center gap-3">
          <span className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-extrabold shrink-0">
            {inviterName.charAt(0).toUpperCase()}
          </span>
          <p className="type-body-lg">
            <span className="font-bold">{inviterName}</span> is planning a trip
          </p>
        </div>

        <h1 className="type-h1 mt-5">{trip.name}</h1>
        <p className="type-body-sm text-muted-foreground mt-1">
          {trip.destination} · {dateLabel} · {days} day{days !== 1 ? "s" : ""}
        </p>

        {/* Crew avatars */}
        {members.length > 0 && (
          <div className="mt-5 flex items-center gap-3">
            {members.slice(0, 4).map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-1 w-12">
                <span className="w-10 h-10 rounded-full bg-secondary text-foreground flex items-center justify-center text-sm font-bold">
                  {m.displayName.charAt(0).toUpperCase()}
                </span>
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {m.displayName.split(" ")[0]}
                </span>
              </div>
            ))}
            {members.length > 4 && (
              <span className="text-xs text-muted-foreground self-start mt-2.5">
                +{members.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Mini map (non-interactive) */}
        {staticMapUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staticMapUrl}
            alt={`Map of ${trip.destination}`}
            className="mt-5 w-full h-[140px] object-cover rounded-2xl border border-border"
          />
        )}

        {/* Plan preview pills */}
        {planPreview.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {planPreview.map((title, i) => (
              <span
                key={i}
                className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground max-w-full truncate"
              >
                {title}
              </span>
            ))}
          </div>
        )}

        {/* CTA — auth-aware join (preserved logic). */}
        <div className="mt-6">
          {user ? (
            <InvitePreviewActions token={token} />
          ) : (
            <JoinTripForm token={token} tripId={invite.tripId} />
          )}
        </div>
      </div>
    </div>
  );
}

function InviteEmpty({ kind }: { kind: "invalid" | "expired" }) {
  return (
    <div className="min-h-svh flex items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-8 pb-6">
          <div className="text-4xl mb-4">{kind === "invalid" ? "🔗" : "⏰"}</div>
          <h2 className="font-semibold text-lg mb-2">
            {kind === "invalid" ? "Invalid invite link" : "Invite expired"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {kind === "invalid"
              ? "This invite link is no longer valid."
              : "Ask the trip organizer to send a new invite link."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
