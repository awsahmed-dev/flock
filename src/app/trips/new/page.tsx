export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CreateTripForm } from "@/components/trips/create-trip-form";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const { destination } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string) => tFromDict(dict, k, undefined, locale);

  return (
    <DashboardShell>
      <div className="max-w-xl mx-auto">
        <Link
          href="/dashboard"
          prefetch
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          {t("nav.dashboard")}
        </Link>
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("trip.createNew")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {t("trip.setupBasics")}
          </p>
        </div>
        <CreateTripForm defaultDestination={destination} />
      </div>
    </DashboardShell>
  );
}
