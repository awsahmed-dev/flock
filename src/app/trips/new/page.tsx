export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CreateTripForm } from "@/components/trips/create-trip-form";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";

export default async function NewTripPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string) => tFromDict(dict, k, undefined, locale);

  return (
    <DashboardShell>
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t("trip.createNew")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("trip.setupBasics")}
          </p>
        </div>
        <CreateTripForm />
      </div>
    </DashboardShell>
  );
}
