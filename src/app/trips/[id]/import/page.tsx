import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { ImportJourney } from "@/components/discover/import-journey";

/**
 * The Import journey (design A+B, chosen 2026-08-22): every entry — Discover
 * chip, Shortlist row, + hub, Now deck card, Android share target — lands
 * here. Entry → review deck (Save/Skip per place) → done → the Shortlist.
 */
export default async function ImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ text?: string }>;
}) {
  const { id } = await params;
  const { text } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");
  return <ImportJourney tripId={id} prefill={text ? text.slice(0, 3000) : ""} />;
}
