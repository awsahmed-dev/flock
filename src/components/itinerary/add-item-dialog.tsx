"use client";

import { useRef, useTransition } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createItineraryItem } from "@/lib/actions/itinerary";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseISO } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import type { InferSelectModel } from "drizzle-orm";
import type { itineraryItems } from "@/lib/db/schema";

type Item = InferSelectModel<typeof itineraryItems>;

interface DefaultValues {
  title?: string;
  locationName?: string;
  type?: string;
}

interface Props {
  tripId: string;
  dayDate: string;
  sortOrder: number;
  onClose: () => void;
  onAdded: (item: Item) => void;
  defaultValues?: DefaultValues;
}

const TYPES = [
  { value: "activity", label: "Activity" },
  { value: "accommodation", label: "Stay" },
  { value: "transport", label: "Transport" },
  { value: "meal", label: "Meal" },
  { value: "other", label: "Other" },
];

export function AddItemDialog({ tripId, dayDate, sortOrder, onClose, onAdded, defaultValues }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("tripId", tripId);
    formData.set("dayDate", dayDate);
    formData.set("sortOrder", sortOrder.toString());

    startTransition(async () => {
      try {
        await createItineraryItem(formData);
        // Optimistic — build a fake item to add immediately
        const fake: Item = {
          id: crypto.randomUUID(),
          tripId,
          dayDate,
          title: formData.get("title") as string,
          type: (formData.get("type") as Item["type"]) || "activity",
          startTime: (formData.get("startTime") as string) || null,
          locationName: (formData.get("locationName") as string) || null,
          locationLat: null,
          locationLng: null,
          costEstimate: formData.get("costEstimate") ? parseFloat(formData.get("costEstimate") as string) : null,
          bookingUrl: (formData.get("bookingUrl") as string) || null,
          notes: (formData.get("notes") as string) || null,
          status: "proposed",
          sortOrder,
          createdBy: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          // B5: stub the new Foursquare metadata fields so the optimistic
          // shape matches Item exactly. Server will leave them NULL.
          fsqId: null,
          fsqCategory: null,
          photoUrl: null,
          rating: null,
          priceLevel: null,
          hoursSummary: null,
          topTip: null,
        };
        onAdded(fake);
        toast.success("Item added");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("paxawa:chat-refresh"));
        }
      } catch (err) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          toast.error("Failed to add item");
        }
      }
    });
  }

  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Add item"
      subtitle={format(parseDateOnly(dayDate), "EEEE, MMM d")}
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => formRef.current?.requestSubmit()}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Add item
          </Button>
        </div>
      }
    >
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" placeholder="e.g. Visit the Colosseum" required autoFocus defaultValue={defaultValues?.title} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                defaultValue={defaultValues?.type ?? "activity"}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startTime">Time</Label>
              <Input id="startTime" name="startTime" type="time" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="locationName">Location</Label>
            <Input id="locationName" name="locationName" placeholder="e.g. Rome, Italy" defaultValue={defaultValues?.locationName} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="costEstimate">Cost estimate</Label>
              <Input id="costEstimate" name="costEstimate" type="number" min="0" step="0.01" placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bookingUrl">Booking link</Label>
              <Input id="bookingUrl" name="bookingUrl" type="url" placeholder="https://..." />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" placeholder="Any details..." />
          </div>

        </form>
    </BottomSheet>
  );
}
