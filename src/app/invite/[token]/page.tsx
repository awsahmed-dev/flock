export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { tripInvites, tripMembers, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JoinTripForm } from "@/components/trips/join-trip-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const invite = await db.query.tripInvites.findFirst({
    where: eq(tripInvites.token, token),
    with: { trip: true },
  });

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-6">
            <div className="text-4xl mb-4">🔗</div>
            <h2 className="font-semibold text-lg mb-2">Invalid invite link</h2>
            <p className="text-sm text-muted-foreground">
              This invite link is no longer valid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.expiresAt && new Date() > invite.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-6">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="font-semibold text-lg mb-2">Invite expired</h2>
            <p className="text-sm text-muted-foreground">
              Ask the trip organizer to send a new invite link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Auto-join if already a user
    const existing = await db.query.tripMembers.findFirst({
      where: (m, { and }) =>
        and(eq(m.tripId, invite.tripId), eq(m.userId, user.id)),
    });

    if (!existing) {
      // Make sure the user has a row in `profiles` before we insert into
      // `trip_members` — Google-OAuth signups don't auto-create a profile
      // and the FK constraint would 500 the page (Bug seen on prod).
      const fallbackName =
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "Traveler";
      await db
        .insert(profiles)
        .values({
          id: user.id,
          displayName: fallbackName,
          email: user.email ?? null,
        })
        .onConflictDoNothing();

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
      });
      await db.insert(tripMembers).values({
        tripId: invite.tripId,
        userId: user.id,
        displayName: profile?.displayName || fallbackName,
        role: "member",
      });
    }

    redirect(`/trips/${invite.tripId}`);
  }

  const trip = invite.trip;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-muted/20">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Paxawa</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>You&apos;ve been invited to join</span>
            </div>
            <CardTitle className="text-xl">{trip.name}</CardTitle>
            <CardDescription className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> {trip.destination}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(parseISO(trip.startDate), "MMM d")} –{" "}
                {format(parseISO(trip.endDate), "MMM d, yyyy")}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinTripForm token={token} tripId={invite.tripId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
