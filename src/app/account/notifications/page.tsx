import { redirect } from "next/navigation";
import { Bell, EnvelopeSimple as Mail, DeviceMobile as Smartphone, Calendar } from "@phosphor-icons/react/dist/ssr";
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
    // Video round 4: this page "looks totally different from Settings". Same
    // language as the account sheet now — 16px rows, one full-width primary
    // action, switches instead of bare checkboxes.
    <div className="min-h-svh bg-background text-foreground">
      {/* Same header as every trip route: Back · title — one shell language. */}
      <header
        className="sticky top-0 z-30 flex items-center gap-2 px-2 h-14 border-b border-border"
        style={{ background: "var(--sheet-bg)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
      >
        <BackButton className="flex items-center h-11 ps-1 pe-2 text-[13px] font-semibold text-foreground active:opacity-70" iconClassName="w-5 h-5 rtl:rotate-180" />
        <p className="flex-1 min-w-0 text-center font-bold text-[15px] truncate">{t("notifications.prefsHeading")}</p>
        <span className="w-16" />
      </header>
      <div className="mx-auto max-w-md px-4 py-6">
      <p className="text-sm text-muted-foreground mb-6">
        {t("notifications.prefsSub")}
      </p>

      <form action={updateNotificationPrefs} className="space-y-3">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <label
              key={r.key}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.caption}</p>
              </div>
              <input
                type="checkbox"
                name={r.key}
                defaultChecked={r.checked}
                className="pax-switch shrink-0"
                aria-label={r.title}
              />
            </label>
          );
        })}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {t("notifications.savePrefs")}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
