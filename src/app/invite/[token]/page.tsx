// Tester 3 finding: previously this page auto-joined a signed-in visitor
// the instant they clicked the link, with no chance to review who invited
// them or what the trip even was. New flow: always show a preview card
// with trip + budget + member list + inviter, and require an explicit
// Accept / Decline. Anonymous visitors still see the existing join form.

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  tripInvites,
  tripMembers,
  profiles,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { JoinTripForm } from "@/components/trips/join-trip-form";
import { InvitePreviewActions } from "@/components/trips/invite-preview";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { MapPin, Calendar, Users, Wallet, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";
import { format, parseISO, differenceInDays } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";

interface Props {
  params: Promise<{ token: string }>;
}

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

  // Member roster (display names only — no PII).
  const members = await db
    .select({ displayName: tripMembers.displayName, role: tripMembers.role })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, invite.tripId));

  // Inviter name (createdBy on the invite row).
  const inviter = await db.query.profiles.findFirst({
    where: eq(profiles.id, invite.createdBy),
    columns: { displayName: true },
  });

  // Signed-in vs anonymous decides which CTA we show.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Idempotent: if signed in and already a member, route them in.
  if (user) {
    const existing = await db.query.tripMembers.findFirst({
      where: and(
        eq(tripMembers.tripId, invite.tripId),
        eq(tripMembers.userId, user.id),
      ),
    });
    if (existing) redirect(`/trips/${invite.tripId}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-muted/20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Link
            href="/"
            className="flex items-center mb-2 text-foreground"
            aria-label="Paxawa home"
          >
            <Logo variant="full" size="md" />
          </Link>
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">
              {inviter?.displayName ?? "Someone"}
            </strong>{" "}
            invited you to a trip
          </p>
        </div>

        <Card className="overflow-hidden">
          {/* Hero strip */}
          <div className="bg-gradient-to-br from-primary/12 via-violet-500/10 to-fuchsia-500/10 px-5 py-6 border-b border-border/60">
            <CardTitle className="text-2xl tracking-tight leading-tight">
              {trip.name}
            </CardTitle>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.destination}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(parseDateOnly(trip.startDate), "MMM d")} –{" "}
                {format(parseDateOnly(trip.endDate), "MMM d, yyyy")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {days} day{days !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <CardContent className="pt-5 space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Users className="w-3.5 h-3.5 text-blue-500" />}
                label="Crew"
                value={`${members.length} traveler${members.length !== 1 ? "s" : ""}`}
              />
              {trip.budgetTotal != null && trip.budgetTotal > 0 ? (
                <StatCard
                  icon={<Wallet className="w-3.5 h-3.5 text-emerald-500" />}
                  label="Trip budget"
                  value={`${trip.currency} ${trip.budgetTotal.toLocaleString()}`}
                />
              ) : (
                <StatCard
                  icon={<Wallet className="w-3.5 h-3.5 text-muted-foreground" />}
                  label="Budget"
                  value="Open"
                />
              )}
            </div>

            {/* Member preview */}
            {members.length > 0 && (
              <div>
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-2">
                  Already in
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {members.slice(0, 6).map((m, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold">
                        {m.displayName.charAt(0).toUpperCase()}
                      </span>
                      {m.displayName}
                      {m.role === "owner" && (
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">
                          host
                        </span>
                      )}
                    </span>
                  ))}
                  {members.length > 6 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{members.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <CardDescription className="text-xs leading-relaxed">
              You'll be added as a member. You can leave at any time from the
              trip's Crew menu.
            </CardDescription>

            {/* Action row */}
            {user ? (
              <InvitePreviewActions token={token} />
            ) : (
              <div className="pt-1 border-t border-border/60">
                <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3 mt-4">
                  Join the trip
                </p>
                <JoinTripForm token={token} tripId={invite.tripId} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function InviteEmpty({ kind }: { kind: "invalid" | "expired" }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
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
