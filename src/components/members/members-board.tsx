"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Copy, Check, Crown, User } from "lucide-react";
import { toast } from "sonner";

interface Member {
  userId: string;
  displayName: string;
  role: "owner" | "member";
}

interface Props {
  tripId: string;
  userId: string;
  isOwner: boolean;
  members: Member[];
  inviteUrl: string | null;
}

function CopyInviteButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied!" : "Copy invite link"}
    </Button>
  );
}

export function MembersBoard({
  tripId,
  userId,
  isOwner,
  members,
  inviteUrl,
}: Props) {
  const owner = members.find((m) => m.role === "owner");
  const otherMembers = members.filter((m) => m.role !== "owner");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "person" : "people"} on this trip
          </p>
        </div>
        {inviteUrl && <CopyInviteButton inviteUrl={inviteUrl} />}
      </div>

      {/* Invite banner */}
      {inviteUrl && (
        <div className="rounded-xl border bg-muted/40 px-4 py-4 space-y-2">
          <p className="text-sm font-medium">Invite your crew</p>
          <p className="text-xs text-muted-foreground">
            Share this link — anyone with it can join. No account required.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <span className="text-xs text-muted-foreground truncate flex-1">
              {inviteUrl}
            </span>
            <CopyInviteButton inviteUrl={inviteUrl} />
          </div>
        </div>
      )}

      {/* Member list */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Travelers · {members.length}
        </h3>
        <div className="space-y-2">
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
  const initials = member.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{member.displayName}</span>
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground">(you)</span>
          )}
        </div>
      </div>

      {/* Role badge */}
      {member.role === "owner" ? (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Crown className="w-3 h-3" />
          Owner
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
          <User className="w-3 h-3" />
          Member
        </Badge>
      )}
    </div>
  );
}
