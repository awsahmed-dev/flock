import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * v2 — the Votes page is retired. Crew voting now lives in Chat as decision
 * cards. Permanent redirect straight to Chat so old links (notifications,
 * emails, bookmarks) land where decisions now happen — no intermediate hop
 * through the also-retired /decisions route.
 */
export default async function VotesPage({ params }: Props) {
  const { id } = await params;
  permanentRedirect(`/trips/${id}/chat`);
}
