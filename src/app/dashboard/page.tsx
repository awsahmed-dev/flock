export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips, tripMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TripGrid } from "@/components/trips/trip-grid";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const userTrips = await db
    .select({ trip: trips })
    .from(tripMembers)
    .innerJoin(trips, eq(tripMembers.tripId, trips.id))
    .where(eq(tripMembers.userId, user.id))
    .orderBy(trips.createdAt);

  return (
    <DashboardShell userId={user.id}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Your trips</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {userTrips.length === 0
              ? "No trips yet — create one to get started"
              : `${userTrips.length} trip${userTrips.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
      <TripGrid trips={userTrips.map((r) => r.trip)} />
    </DashboardShell>
  );
}
