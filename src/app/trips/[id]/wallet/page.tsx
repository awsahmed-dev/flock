export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { WalletBoard } from "@/components/wallet/wallet-board";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Wallet — the "trip ticket vault." Each member's hotel/flight/bus/train
 * /eSIM/activity confirmations live here, with rich card visuals and a
 * tap-into ticket detail with barcode/QR + download CTA.
 *
 * Currently rendering mock data; gated behind ?previewAffiliate=1 at the
 * tab level so prod testers don't land here by accident. Real data flows
 * in once the forwarded-email parser ships.
 */
export default async function WalletPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  return (
    <div className="p-4 sm:p-6">
      <WalletBoard
        userId={user.id}
        tripName={trip.name}
        destination={trip.destination}
        startDate={trip.startDate as string}
        endDate={trip.endDate as string}
      />
    </div>
  );
}
