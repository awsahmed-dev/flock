"use client";

import { useState } from "react";
import { Crown, UserPlus } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { ShareTripSheet } from "@/components/trips/share-trip-sheet";
import { useT } from "@/components/i18n/locale-provider";

interface Member {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  user?: { avatarUrl?: string | null; displayName?: string | null } | null;
}

/** §10.3: the live profile name wins over the join-time cached copy —
 *  "Aws", never "awsahmed68". */
function memberName(m: Member): string {
  return m.user?.displayName || m.displayName;
}

interface Props {
  tripId: string;
  tripName: string;
  userId: string;
  isOwner: boolean;
  members: Member[];
  inviteUrl: string | null;
}

/* isOwner + inviteUrl are passed by the page but the current MVP doesn't
 * use them (no remove/role-edit yet; the share sheet mints its own link).
 * Keep them in the prop type so the page contract stays stable when those
 * actions land. */
export function MembersBoard({
  tripId,
  tripName,
  userId,
  isOwner: _isOwner,
  members,
  inviteUrl: _inviteUrl,
}: Props) {
  const t = useT();
  const owner = members.find((m) => m.role === "owner");
  const otherMembers = members.filter((m) => m.role !== "owner");
  const ordered = owner ? [owner, ...otherMembers] : otherMembers;
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* §11: back to the trip (mobile "← trip name" affordance). */}
      <PageHeader
        backHref={`/trips/${tripId}`}
        title={t("crew.headerTitle")}
        subtitle={t("crew.headerSubtitle", { count: members.length })}
      />

      <ShareTripSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        tripId={tripId}
        tripName={tripName}
        crew={members.map((m) => ({
          userId: m.userId,
          displayName: memberName(m),
          avatarUrl: m.user?.avatarUrl ?? null,
        }))}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {t("crew.travelers")} · {members.length}
          </h3>
          <div className="flex-1 h-px bg-border/60" />
        </div>
        {/* Single-column stack on mobile; fills width on desktop. */}
        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3">
          {ordered.map((m) => (
            <MemberRow key={m.userId} member={m} isCurrentUser={m.userId === userId} />
          ))}
        </div>
      </section>

      {/* §11: full-width invite CTA — opens the share sheet (real /invite
          link + native share). The shell <main> already clears the nav. */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl font-semibold text-white active:scale-[0.98] transition-transform"
          style={{ height: 52, background: "var(--clr-brand)" }}
        >
          <UserPlus className="w-5 h-5" />
          {t("crew.inviteMore")}
        </button>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  isCurrentUser,
}: {
  member: Member;
  isCurrentUser: boolean;
}) {
  const t = useT();
  const avatarUrl = member.user?.avatarUrl ?? null;
  const isOwner = member.role === "owner";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 hover:border-foreground/15 transition-colors">
      {/* §11: 48px avatar — photo, or an accent-tinted initial. */}
      <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0 overflow-hidden">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={memberName(member)} className="w-full h-full object-cover" />
        ) : (
          <span className="text-primary font-bold text-lg">
            {(memberName(member) || "?")[0].toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">
          {memberName(member)}
          {isCurrentUser && (
            <span className="text-muted-foreground font-normal"> {t("crew.you")}</span>
          )}
        </p>
      </div>

      {/* Role chip — accent purple for owner, muted for member. */}
      {isOwner ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase shrink-0">
          <Crown className="w-3 h-3" />
          {t("crew.owner")}
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase shrink-0">
          {t("crew.member")}
        </span>
      )}
    </div>
  );
}
