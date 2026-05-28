// Slow-changing data; let Next persist across nav. Mutations call
// revalidatePath() to flush as needed.
export const revalidate = 30;

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { packingItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { PackingBoard } from "@/components/packing/packing-board";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PackingPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const items = await db.query.packingItems.findMany({
    where: eq(packingItems.tripId, id),
    orderBy: [asc(packingItems.category), asc(packingItems.createdAt)],
  });

  return (
    <PackingBoard
      tripId={id}
      userId={user.id}
      items={items.map((i) => ({
        id: i.id,
        label: i.label,
        category: i.category,
        packed: i.packed,
        notes: i.notes,
        userId: i.userId,
        createdBy: i.createdBy,
      }))}
      members={trip.members.map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
      }))}
    />
  );
}
