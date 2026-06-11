"use client";

import { VoteCard } from "./vote-card";
import { CreateVoteDialog } from "./create-vote-dialog";
import { Vote } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";

interface VoteOption {
  id: string;
  label: string;
  costEstimate: number | null;
  sortOrder: number;
}

interface VoteResponse {
  id: string;
  userId: string;
  selectedOptionId: string;
}

interface VoteData {
  id: string;
  tripId: string;
  question: string;
  status: "open" | "closed";
  deadline: Date | null;
  createdBy: string;
  createdAt: Date;
  resolvedAt: Date | null;
  options: VoteOption[];
  responses: VoteResponse[];
}

interface Props {
  tripId: string;
  userId: string;
  isOwner: boolean;
  currency: string;
  votes: VoteData[];
}

export function VotesBoard({ tripId, userId, isOwner, currency, votes }: Props) {
  const t = useT();
  const openVotes = votes.filter((v) => v.status === "open");
  const closedVotes = votes.filter((v) => v.status === "closed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t("votes.title")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("votes.subtitle")}</p>
        </div>
        <CreateVoteDialog tripId={tripId} />
      </div>

      {/* Active votes */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5">
            {openVotes.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {t("votes.active")} · {openVotes.length}
            </h3>
          </div>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        {openVotes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <Vote className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-sm mb-1">{t("votes.noActiveVotes")}</p>
            <p className="text-xs text-muted-foreground mb-5">{t("votes.createPrompt")}</p>
            <CreateVoteDialog tripId={tripId} />
          </div>
        ) : (
          // B27-r2: desktop uses a 2-col grid so multiple open votes don't
          // produce an awkward tall scroll. Mobile keeps the single column.
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
            {openVotes.map((vote) => (
              <VoteCard key={vote.id} vote={vote} userId={userId} isOwner={isOwner} currency={currency} />
            ))}
          </div>
        )}
      </div>

      {/* Resolved votes */}
      {closedVotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {t("votes.closed")} · {closedVotes.length}
            </h3>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
            {closedVotes.map((vote) => (
              <VoteCard key={vote.id} vote={vote} userId={userId} isOwner={isOwner} currency={currency} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
