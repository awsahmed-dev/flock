import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { BackButton } from "@/components/navigation/back-button";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";
import { ProfileForm } from "@/components/account/profile-form";

export const dynamic = "force-dynamic";

/**
 * B19: profile page — name + avatar + bio. Sits next to the existing
 * notifications page under /account.
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    columns: {
      displayName: true,
      avatarUrl: true,
      bio: true,
      email: true,
    },
  });

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string, p?: Record<string, string | number>) =>
    tFromDict(dict, k, p, locale);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <BackButton
            iconOnly
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            iconClassName="w-4 h-4 rtl:rotate-180"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold tracking-wider uppercase text-muted-foreground">
              {t("profile.section")}
            </p>
            <h1 className="text-base font-extrabold truncate">
              {t("profile.title")}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <ProfileForm
          userId={user.id}
          initialName={profile?.displayName ?? ""}
          initialBio={profile?.bio ?? ""}
          initialAvatarUrl={profile?.avatarUrl ?? null}
          email={profile?.email ?? user.email ?? null}
        />
      </main>
    </div>
  );
}
