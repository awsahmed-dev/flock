"use client";

import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVote } from "@/lib/actions/votes";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  tripId: string;
}

export function CreateVoteDialog({ tripId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState([
    { label: "", cost: "" },
    { label: "", cost: "" },
  ]);

  // Cap at MAX_OPTIONS so a vote stays scannable. Two is the floor (a vote
  // needs a choice), five is the ceiling (anything more is usually really
  // a planning thread, not a single decision).
  const MAX_OPTIONS = 5;

  function addOption() {
    setOptions((prev) =>
      prev.length >= MAX_OPTIONS ? prev : [...prev, { label: "", cost: "" }],
    );
  }

  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, field: "label" | "cost", value: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, [field]: value } : opt))
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Inject options into formData
    options.forEach((opt, i) => {
      formData.set(`option_label_${i}`, opt.label);
      if (opt.cost) formData.set(`option_cost_${i}`, opt.cost);
    });

    startTransition(async () => {
      try {
        await createVote(formData);
        toast.success("Vote created");
        track.voteOpened(tripId);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("paxawa:chat-refresh"));
        }
        // B13a: flushSync forces the dialog close *before* the
        // revalidatePath-driven page refresh re-renders the tree.
        // Without it, this setOpen sat in the transition queue behind
        // the Suspense refresh for 3-5s and the sheet looked stuck.
        flushSync(() => {
          setOpen(false);
          setOptions([
            { label: "", cost: "" },
            { label: "", cost: "" },
          ]);
        });
      } catch (err) {
        toast.error((err as Error).message || "Failed to create vote");
      }
    });
  }

  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1" />New vote
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Create a vote"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={isPending}
              onClick={() => formRef.current?.requestSubmit()}
            >
              {isPending ? "Creating…" : "Create vote"}
            </Button>
          </div>
        }
      >
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="tripId" value={tripId} />

          <div className="space-y-1.5">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              name="question"
              placeholder="Which hotel should we book?"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <Input id="deadline" name="deadline" type="datetime-local" />
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt.label}
                  onChange={(e) => updateOption(i, "label", e.target.value)}
                  required
                  className="flex-1"
                />
                <Input
                  placeholder="Cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={opt.cost}
                  onChange={(e) => updateOption(i, "cost", e.target.value)}
                  className="w-24"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < MAX_OPTIONS ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addOption}
                className="w-full border border-dashed"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add option ({options.length}/{MAX_OPTIONS})
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center pt-1">
                Max {MAX_OPTIONS} options — keep votes scannable.
              </p>
            )}
          </div>

        </form>
      </BottomSheet>
    </>
  );
}
