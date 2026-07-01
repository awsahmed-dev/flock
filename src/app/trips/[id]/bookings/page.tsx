import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 0-D: the Bookings surface lives at /wallet, but the MANAGE tab is labelled
 * "Bookings", so a direct hit or deep link to /bookings used to 404. Permanent
 * (308) redirect to the real route.
 */
export default async function BookingsRedirect({ params }: Props) {
  const { id } = await params;
  permanentRedirect(`/trips/${id}/wallet`);
}
