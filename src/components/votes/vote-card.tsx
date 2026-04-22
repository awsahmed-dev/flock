"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { castVote, closeVote, deleteVote } from "@/lib/actions/votes";
import { toast } from "sonner";
import { CheckCircle2, Clock, MoreHorizontal, Lock, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

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

interface Vote {
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
  vote: Vote;
  userId: string;
  isOwner: boolean;
  currency: string;
}

export function VoteCard({ vote, userId, isOwner, currency }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticSelected, setOptimisticSelected] = useState<string | null>(
    vote.responses.find((r) => r.userId === userId)?.selectedOptionId ?? null
  );

  const totalResponses = vote.responses.length;
  const myResponse = vote.responses.find((r) => r.userId === userId);
  const hasVoted = !!myResponse || !!optimisticSelected;
  const canModify = vote.createdBy === userId || isOwner;
  const showResults = vote.status === "closed" || hasVoted;

  // Tally counts per option
  const countsByOption = vote.options.reduce<Record<string, number>>(
    (acc, opt) => {
      acc[opt.id] = vote.responses.filter(
        (r) => r.selectedOptionId === opt.id
      ).length;
      return acc;
    },
    {}
  );

  const winningOptionId =
    vote.status === "closed"
      ? vote.options.reduce((best, opt) =>
          (countsByOption[opt.id] ?? 0) > (countsByOption[best.id] ?? 0)
            ? opt
            : best
        ).id
      : null;

  function handleCast(optionId: string) {
    setOptimisticSelected(optionId);
    const fd = new FormData();
    fd.set("voteId", vote.id);
    fd.set("selectedOptionId", optionId);
    fd.set("tripId", vote.tripId);
    startTransition(async () => {
      try {
        await castVote(fd);
      } catch {
        setOptimisticSelected(myResponse?.selectedOptionId ?? null);
        toast.error("Failed to cast vote");
      }
    });
  }

  function handleClose() {
    const fd = new FormData();
    fd.set("voteId", vote.id);
    fd.set("tripId", vote.tripId);
    startTransition(async () => {
      try {
        await closeVote(fd);
        toast.success("Vote closed");
      } catch {
        toast.error("Failed to close vote");
      }
    });
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("voteId", vote.id);
    fd.set("tripId", vote.tripId);
    startTransition(async () => {
      try {
        await deleteVote(fd);
        toast.success("Vote deleted");
      } catch {
        toast.error("Failed to delete vote");
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={vote.status === "open" ? "default" : "secondary"}
              className="text-xs"
            >
              {vote.status === "open" ? (
                <Clock className="w-3 h-3 mr-1" />
              ) : (
                <Lock className="w-3 h-3 mr-1" />
              )}
              {vote.status === "open" ? "Open" : "Closed"}
            </Badge>
            {vote.deadline && vote.status === "open" && (
              <span className="text-xs text-muted-foreground">
                Closes {formatDistanceToNow(new Date(vote.deadline), { addSuffix: true })}
              </span>
            )}
          </div>
          <p className="font-medium leading-snug">{vote.question}</p>
          <p className="text-xs text-muted-foreground">
            {totalResponses} {totalResponses === 1 ? "response" : "responses"}
          </p>
        </div>

        {canModify && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end">
              {vote.status === "open" && (
                <DropdownMenuItem
                  render={<button className="w-full text-left" />}
                  onClick={handleClose}
                  disabled={isPending}
                >
                  <Lock className="w-3.5 h-3.5 mr-2" />
                  Close vote
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                render={<button className="w-full text-left text-destructive" />}
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {vote.options
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((opt) => {
            const count = countsByOption[opt.id] ?? 0;
            const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
            const isSelected =
              (optimisticSelected ?? myResponse?.selectedOptionId) === opt.id;
            const isWinner = winningOptionId === opt.id;

            if (vote.status === "open" && !hasVoted) {
              // Voting state — clickable options
              return (
                <button
                  key={opt.id}
                  onClick={() => handleCast(opt.id)}
                  disabled={isPending}
                  className="w-full text-left rounded-lg border px-4 py-3 hover:bg-muted/60 hover:border-foreground/30 transition-all flex items-center justify-between group"
                >
                  <span className="font-medium text-sm">{opt.label}</span>
                  {opt.costEstimate != null && (
                    <span className="text-xs text-muted-foreground">
                      {currency} {opt.costEstimate.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            }

            // Results state — show bar
            return (
              <div
                key={opt.id}
                className={`rounded-lg border px-4 py-3 space-y-1.5 ${
                  isSelected ? "border-foreground bg-muted/40" : ""
                } ${isWinner ? "border-green-500/60 bg-green-50 dark:bg-green-950/20" : ""}`}
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {isWinner && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    )}
                    <span className={`font-medium ${isWinner ? "text-green-700 dark:text-green-400" : ""}`}>
                      {opt.label}
                    </span>
                    {isSelected && (
                      <span className="text-xs text-muted-foreground">(your vote)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-xs">
                    {opt.costEstimate != null && (
                      <span>{currency} {opt.costEstimate.toLocaleString()}</span>
                    )}
                    <span className="tabular-nums font-medium text-foreground">
                      {pct}%
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isWinner ? "bg-green-500" : "bg-foreground/30"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* Cast / change vote prompt */}
      {vote.status === "open" && hasVoted && (
        <p className="text-xs text-muted-foreground">
          Click any option above to change your vote.
        </p>
      )}
    </div>
  );
}
