import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Cleanup 6: the Bookings surface lives at /wallet, but the MANAGE tab is
 * labelled "Bookings", so a direct hit or deep link to /bookings used to 404.
 * Redirect it to the real route.
 */
export default async function BookingsRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/trips/${id}/wallet`);
}
