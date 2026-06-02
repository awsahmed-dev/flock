import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Bell, Mail, Smartphone, Calendar } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateNotificationPrefs } from "@/lib/actions/notifications-prefs";

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

  const rows = [
    {
      key: "notif_inapp",
      checked: prefs.notifInapp,
      icon: Bell,
      title: "In-app bell",
      caption: "Show the bell badge and dropdown of recent activity.",
    },
    {
      key: "notif_email",
      checked: prefs.notifEmail,
      icon: Mail,
      title: "Transactional email",
      caption: "Real-time emails when someone logs an expense, opens a vote, or settles up.",
    },
    {
      key: "notif_push",
      checked: prefs.notifPush,
      icon: Smartphone,
      title: "Push notifications",
      caption: "Browser + mobile push for the same events. You'll be asked to enable push on first opt-in.",
    },
    {
      key: "notif_digest",
      checked: prefs.notifDigest,
      icon: Calendar,
      title: "Daily digest email",
      caption: "One summary email per active trip per day — quieter than per-event mail.",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back to trips
      </Link>

      <h1 className="text-2xl font-bold mb-1">Notifications</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Choose how you'd like to hear about trip activity. Each channel can be
        flipped independently.
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
            Save preferences
          </button>
        </div>
      </form>
    </div>
  );
}
