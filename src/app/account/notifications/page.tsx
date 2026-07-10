import { redirect } from "next/navigation";
import { Bell, Mail, Smartphone, Calendar } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { BackButton } from "@/components/navigation/back-button";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateNotificationPrefs } from "@/lib/actions/notifications-prefs";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * B13c: account-level notification preferences. Four channels,
 * defaults all on. Form posts to a server action; revalidatePath
 * refreshes this page in place.
 */
export default async function NotificationPrefsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    columns: {
      notifInapp: true,
      notifEmail: true,
      notifPush: true,
      notifDigest: true,
    },
  });

  const prefs = {
    notifInapp: profile?.notifInapp ?? true,
    notifEmail: profile?.notifEmail ?? true,
    notifPush: profile?.notifPush ?? true,
    notifDigest: profile?.notifDigest ?? true,
  };

  // B15: server-side translate. The page is fully RSC so we pull from
  // the dictionary in-process rather than shipping the JSON to the
  // browser.
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string, p?: Record<string, string | number>) =>
    tFromDict(dict, k, p, locale);

  const rows = [
    {
      key: "notif_inapp",
      checked: prefs.notifInapp,
      icon: Bell,
      title: t("notifications.inAppBell"),
      caption: t("notifications.inAppDesc"),
    },
    {
      key: "notif_email",
      checked: prefs.notifEmail,
      icon: Mail,
      title: t("notifications.txEmail"),
      caption: t("notifications.txEmailDesc"),
    },
    {
      key: "notif_push",
      checked: prefs.notifPush,
      icon: Smartphone,
      title: t("notifications.push"),
      caption: t("notifications.pushDesc"),
    },
    {
      key: "notif_digest",
      checked: prefs.notifDigest,
      icon: Calendar,
      title: t("notifications.digest"),
      caption: t("notifications.digestDesc"),
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6"
        iconClassName="w-3.5 h-3.5 rtl:rotate-180"
      />

      <h1 className="text-2xl font-bold mb-1">{t("notifications.prefsHeading")}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {t("notifications.prefsSub")}
      </p>

      <form action={updateNotificationPrefs} className="space-y-2">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <label
              key={r.key}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/30 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.caption}
                </p>
              </div>
              <input
                type="checkbox"
                name={r.key}
                defaultChecked={r.checked}
                className="mt-1 w-5 h-5 accent-primary cursor-pointer shrink-0"
              />
            </label>
          );
        })}

        <div className="pt-4 flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-violet-600 text-white px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            {t("notifications.savePrefs")}
          </button>
        </div>
      </form>
    </div>
  );
}
