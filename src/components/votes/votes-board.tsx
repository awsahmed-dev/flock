import { VoteCard } from "./vote-card";
import { CreateVoteDialog } from "./create-vote-dialog";
import { Vote } from "lucide-react";

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
  const openVotes = votes.filter((v) => v.status === "open");
  const closedVotes = votes.filter((v) => v.status === "closed");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Votes</h2>
          <p className="text-sm text-muted-foreground">
            Make group decisions together
          </p>
        </div>
        <CreateVoteDialog tripId={tripId} />
      </div>

      {/* Active votes */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Active · {openVotes.length}
        </h3>
        {openVotes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            <Vote className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active votes</p>
            <p className="text-xs mt-1">Create one to get the group&apos;s input</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openVotes.map((vote) => (
              <VoteCard
                key={vote.id}
                vote={vote}
                userId={userId}
                isOwner={isOwner}
                currency={currency}
              />
            ))}
          </div>
        )}
      </section>

      {/* Resolved votes */}
      {closedVotes.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Resolved · {closedVotes.length}
          </h3>
          <div className="space-y-3">
            {closedVotes.map((vote) => (
              <VoteCard
                key={vote.id}
                vote={vote}
                userId={userId}
                isOwner={isOwner}
                currency={currency}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
