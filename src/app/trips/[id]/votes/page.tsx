import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * v2 — the Votes page is retired. Crew voting now lives in chat as decision
 * cards, surfaced together on the Decisions lens. Permanent redirect so old
 * links (notifications, bookmarks) land on the new surface.
 */
export default async function VotesPage({ params }: Props) {
  const { id } = await params;
  redirect(`/trips/${id}/decisions`);
}
