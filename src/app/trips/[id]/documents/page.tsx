export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { TripShell } from "@/components/trips/trip-shell";
import { DocumentsBoard } from "@/components/documents/documents-board";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentsPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );

  const docs = await db.query.documents.findMany({
    where: eq(documents.tripId, id),
    with: { uploader: true },
    orderBy: [asc(documents.createdAt)],
  });

  return (
    <TripShell trip={trip} userId={user.id}>
      <DocumentsBoard
        tripId={id}
        userId={user.id}
        isOwner={isOwner}
        documents={docs as any}
      />
    </TripShell>
  );
}
