export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { listDecisionsForLens } from "@/lib/actions/decisions";
import { DecisionsBoard } from "@/components/decisions/decisions-board";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * v2 Decisions lens — replaces the standalone Votes page. Lists every crew
 * decision (the chat-embedded place vote), defaulting to the ones still
 * waiting on the current user. Voting happens inline on each card.
 */
export default async function DecisionsPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const rows = await listDecisionsForLens(id);

  return <DecisionsBoard tripId={id} rows={rows} />;
}
