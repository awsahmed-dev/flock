import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Phase 6 §6-C: the /wallet route is DEAD. Bookings are BookingAnchor stops
 * in the itinerary now; money lives at /money.
 */
export default async function WalletRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/trips/${id}/money`);
}
