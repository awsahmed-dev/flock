"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { documents, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";

async function getAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function createDocument(formData: FormData) {
  const user = await getAuthenticatedUser();
  const tripId = formData.get("tripId") as string;

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName:
        (user as any).user_metadata?.display_name ||
        (user as any).email?.split("@")[0] ||
        "Traveler",
      email: (user as any).email,
    })
    .onConflictDoNothing();

  const title = formData.get("title") as string;
  const url = formData.get("url") as string;
  const type = (formData.get("type") as string) || "link";
  const dayDate = (formData.get("dayDate") as string) || null;
  // B6: free-text description shown alongside the title in the Pack list.
  const descriptionRaw = (formData.get("description") as string | null) ?? "";
  const description = descriptionRaw.trim() ? descriptionRaw.trim() : null;

  if (!title?.trim() || !url?.trim()) throw new Error("Title and URL are required");

  // Normalize URL
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  await db.insert(documents).values({
    tripId,
    type: type as any,
    url: normalizedUrl,
    title: title.trim(),
    description,
    dayDate,
    uploadedBy: user.id,
  });

  revalidatePath(`/trips/${tripId}/documents`);
  revalidatePath(`/trips/${tripId}/pack`);
}

export async function deleteDocument(formData: FormData) {
  const user = await getAuthenticatedUser();
  const documentId = formData.get("documentId") as string;
  const tripId = formData.get("tripId") as string;

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });
  if (!doc) throw new Error("Document not found");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );
  if (doc.uploadedBy !== user.id && !isOwner) {
    throw new Error("Not authorized to delete this document");
  }

  await db.delete(documents).where(eq(documents.id, documentId));
  revalidatePath(`/trips/${tripId}/documents`);
  revalidatePath(`/trips/${tripId}/pack`);
}
