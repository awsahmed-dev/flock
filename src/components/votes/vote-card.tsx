"use client";

import { useState, useTransition } from "react";
import { castVote, closeVote, deleteVote } from "@/lib/actions/votes";
import { toast } from "sonner";
import { CheckCircle2, Clock, MoreHorizontal, Lock, Trash2, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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

  const countsByOption = vote.options.reduce<Record<string, number>>((acc, opt) => {
    acc[opt.id] = vote.responses.filter((r) => r.selectedOptionId === opt.id).length;
    return acc;
  }, {});

  const winningOptionId =
    vote.status === "closed"
      ? vote.options.reduce((best, opt) =>
          (countsByOption[opt.id] ?? 0) > (countsByOption[best.id] ?? 0) ? opt : best
        ).id
      : null;

  function handleCast(optionId: string) {
    setOptimisticSelected(optionId);
    const fd = new FormData();
    fd.set("voteId", vote.id);
    fd.set("selectedOptionId", optionId);
    fd.set("tripId", vote.tripId);
    startTransition(async () => {
      try { await castVote(fd); }
      catch {
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
      try { await closeVote(fd); toast.success("Vote closed"); }
      catch { toast.error("Failed to close vote"); }
    });
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("voteId", vote.id);
    fd.set("tripId", vote.tripId);
    startTransition(async () => {
      try { await deleteVote(fd); toast.success("Vote deleted"); }
      catch { toast.error("Failed to delete vote"); }
    });
  }

  const isOpen = vote.status === "open";

  return (
    <div className={cn(
      "rounded-2xl border bg-card overflow-hidden transition-all",
      isOpen ? "border-border/60" : "border-border/40 opacity-80"
    )}>
      {/* Status bar */}
      <div className={cn(
        "h-1 w-full",
        isOpen ? "bg-gradient-to-r from-blue-500 to-violet-500" : "bg-muted"
      )} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                isOpen
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                  : "bg-muted text-muted-foreground"
              )}>
                {isOpen
                  ? <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Open</>
                  : <><Lock className="w-3 h-3" />Closed</>
                }
              </span>
              {vote.deadline && isOpen && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Closes {formatDistanceToNow(new Date(vote.deadline), { addSuffix: true })}
                </span>
              )}
            </div>
            <p className="font-semibold leading-snug">{vote.question}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {totalResponses} {totalResponses === 1 ? "response" : "responses"}
            </div>
          </div>

          {canModify && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                {isOpen && (
                  <DropdownMenuItem onClick={handleClose} disabled={isPending} className="gap-2">
                    <Lock className="w-3.5 h-3.5" /> Close vote
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isPending}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2">
          {vote.options
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((opt) => {
              const count = countsByOption[opt.id] ?? 0;
              const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
              const isSelected = (optimisticSelected ?? myResponse?.selectedOptionId) === opt.id;
              const isWinner = winningOptionId === opt.id;

              if (isOpen && !hasVoted) {
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleCast(opt.id)}
                    disabled={isPending}
                    className="w-full text-left rounded-xl border border-border/60 px-4 py-3 hover:bg-muted/60 hover:border-primary/40 hover:-translate-y-px transition-all flex items-center justify-between group"
                  >
                    <span className="font-medium text-sm">{opt.label}</span>
                    {opt.costEstimate != null && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {currency} {opt.costEstimate.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <div
                  key={opt.id}
                  onClick={isOpen && hasVoted ? () => handleCast(opt.id) : undefined}
                  className={cn(
                    "rounded-xl border px-4 py-3 space-y-2 transition-all",
                    isOpen && hasVoted && "cursor-pointer hover:border-primary/30",
                    isSelected && !isWinner && "border-primary/40 bg-primary/5",
                    isWinner && "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/20",
                    !isSelected && !isWinner && "border-border/40"
                  )}
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {isWinner && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      <span className={cn("font-medium", isWinner && "text-emerald-700 dark:text-emerald-300")}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full">
                          your vote
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {opt.costEstimate != null && (
                        <span className="tabular-nums">{currency} {opt.costEstimate.toLocaleString()}</span>
                      )}
                      <span className="tabular-nums font-semibold text-foreground">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isWinner ? "bg-emerald-500" : isSelected ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {isOpen && hasVoted && (
          <p className="text-xs text-muted-foreground text-center">
            Tap any option to change your vote
          </p>
        )}
      </div>
    </div>
  );
}
