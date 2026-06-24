import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Decisions folded into Chat. The decision cards render inline in Chat
 * (message-bubble `decision_card`) and the standalone /decisions tab was
 * retired from nav. We keep the route as a permanent redirect so old links
 * and notification deep-links don't 404 — they land in Chat where the
 * decisions now live.
 */
export default async function DecisionsRedirect({ params }: Props) {
  const { id } = await params;
  // 308 Permanent — the fold is permanent, so browsers/crawlers can cache
  // it and stop re-resolving the retired route (`redirect()` would emit 307).
  permanentRedirect(`/trips/${id}/chat`);
}
