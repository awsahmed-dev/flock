import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips, tripMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getToday } from "@/lib/today-server";
import { toIsoDay } from "@/lib/today";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";

/**
 * Android share target (manifest.share_target → GET /share-target?url&text&title).
 * Share a TikTok/Instagram post to Paxawa → pick the trip → the import sheet
 * opens with the link prefilled. One trip that isn't finished → skip the
 * question and go straight there.
 */
export default async function ShareTargetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  // Apps put the link in url OR text (TikTok shares via text); title is noise.
  const shared = [pick(sp.url), pick(sp.text)].filter(Boolean).join(" ").trim().slice(0, 3000);

  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/share-target?text=${encodeURIComponent(shared)}`)}`);

  const rows = await db
    .select({ trip: trips })
    .from(tripMembers)
    .innerJoin(trips, eq(tripMembers.tripId, trips.id))
    .where(eq(tripMembers.userId, user.id));
  const todayIso = await getToday();
  const active = rows
    .map((r) => r.trip)
    .filter((t) => toIsoDay(t.endDate) >= todayIso)
    .sort((a, b) => toIsoDay(a.startDate).localeCompare(toIsoDay(b.startDate)));

  const dest = (t: { id: string }) => `/trips/${t.id}?import=${encodeURIComponent(shared || "1")}`;
  if (active.length === 1) redirect(dest(active[0]));
  if (active.length === 0) redirect("/dashboard");

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string, p?: Record<string, string | number>) => tFromDict(dict, k, p, locale);

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--clr-brand) 14%, transparent)" }}>
            <Sparkle size={20} weight="fill" style={{ color: "var(--clr-brand)" }} />
          </span>
          <h1 className="text-lg font-bold">{t("inspire.shareTitle")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{t("inspire.sharePick")}</p>
        <div className="space-y-2.5">
          {active.map((trip) => (
            <Link key={trip.id} href={dest(trip)} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 active:scale-[0.99] transition-transform">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold truncate">{trip.name}</p>
                <p className="text-[12px] text-muted-foreground truncate mt-0.5">{trip.destination}</p>
              </div>
              <span className="text-muted-foreground rtl:rotate-180">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
