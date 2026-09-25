import { permanentRedirect } from "next/navigation";
import { staysHref } from "@/lib/stays";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * /bookings used to point at /wallet, which is retired (it redirects to
 * /money). Bookings now means Discover's Bookings tab — where Stays lives.
 */
export default async function BookingsRedirect({ params }: Props) {
  const { id } = await params;
  permanentRedirect(staysHref(id));
}
