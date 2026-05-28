// Slow-changing data; let Next persist across nav. Mutations call
// revalidatePath() to flush as needed.
export const revalidate = 30;

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
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
    <DocumentsBoard
      tripId={id}
      userId={user.id}
      isOwner={isOwner}
      documents={docs as any}
    />
  );
}
