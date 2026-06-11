"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useT } from "@/components/i18n/locale-provider";

interface Member {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  user?: { avatarUrl?: string | null } | null;
}

interface Props {
  tripId: string;
  userId: string;
  isOwner: boolean;
  members: Member[];
  inviteUrl: string | null;
}

function CopyInviteButton({ inviteUrl }: { inviteUrl: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success(t("crew.inviteCopiedToast"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("crew.failedToCopyToast"));
    }
  }

  return (
    <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? t("common.copied") : t("crew.copyInviteLink")}
    </Button>
  );
}

/* tripId + isOwner are passed by the page but the current MVP doesn't
 * use them (no remove/role-edit yet). Keep them in the prop type so the
 * page contract stays stable when those actions land. */
export function MembersBoard({
  tripId: _tripId,
  userId,
  isOwner: _isOwner,
  members,
  inviteUrl,
}: Props) {
  const t = useT();
  const owner = members.find((m) => m.role === "owner");
  const otherMembers = members.filter((m) => m.role !== "owner");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("crew.headerTitle")}
        subtitle={t("crew.headerSubtitle", { count: members.length })}
      />

      {inviteUrl && (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-violet-500/5 to-fuchsia-500/5 p-4 space-y-2.5">
          <div>
            <p className="text-sm font-bold">{t("crew.inviteYourCrew")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("crew.anyoneWithLink")}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card ps-3 pe-1 py-1">
            <span className="text-[11px] text-muted-foreground truncate flex-1 font-mono">
              {inviteUrl.replace(/^https?:\/\//, "")}
            </span>
            <CopyInviteButton inviteUrl={inviteUrl} />
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {t("crew.travelers")} · {members.length}
          </h3>
          <div className="flex-1 h-px bg-border/60" />
        </div>
        {/* B27-r2: desktop grid of member cards (2 col on lg, 3 on xl) so
            the page fills its width and shows multiple travelers at once.
            Mobile stays as a single-column stack. */}
        <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3">
          {owner && (
            <MemberRow
              member={owner}
              isCurrentUser={owner.userId === userId}
            />
          )}
          {otherMembers.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              isCurrentUser={m.userId === userId}
            />
          ))}
        </div>
      </section>
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

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 hover:border-foreground/15 transition-colors">
      <UserAvatar
        name={member.displayName}
        avatarUrl={member.user?.avatarUrl ?? null}
        seed={member.userId}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{member.displayName}</span>
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground">{t("crew.you")}</span>
          )}
        </div>
      </div>
      {member.role === "owner" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
          <Crown className="w-3 h-3" />
          {t("crew.owner")}
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
          {t("crew.member")}
        </span>
      )}
    </div>
  );
}
