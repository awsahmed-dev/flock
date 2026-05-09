export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CreateTripForm } from "@/components/trips/create-trip-form";

export default async function NewTripPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  return (
    <DashboardShell>
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Create a new trip</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set up the basics — you can always edit later.
          </p>
        </div>
        <CreateTripForm />
      </div>
    </DashboardShell>
  );
}
