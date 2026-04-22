"use client";

import { useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateItineraryItem } from "@/lib/actions/itinerary";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { InferSelectModel } from "drizzle-orm";
import type { itineraryItems } from "@/lib/db/schema";

type Item = InferSelectModel<typeof itineraryItems>;

interface Props {
  item: Item;
  tripId: string;
  onClose: () => void;
  onUpdated: (item: Item) => void;
}

const TYPES = [
  { value: "activity", label: "Activity" },
  { value: "accommodation", label: "Stay" },
  { value: "transport", label: "Transport" },
  { value: "meal", label: "Meal" },
  { value: "other", label: "Other" },
];

export function EditItemDialog({ item, tripId, onClose, onUpdated }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("itemId", item.id);
    formData.set("tripId", tripId);

    startTransition(async () => {
      try {
        await updateItineraryItem(formData);
        const updated: Item = {
          ...item,
          title: formData.get("title") as string,
          type: formData.get("type") as Item["type"],
          startTime: (formData.get("startTime") as string) || null,
          locationName: (formData.get("locationName") as string) || null,
          costEstimate: formData.get("costEstimate") ? parseFloat(formData.get("costEstimate") as string) : null,
          bookingUrl: (formData.get("bookingUrl") as string) || null,
          notes: (formData.get("notes") as string) || null,
        };
        onUpdated(updated);
        toast.success("Item updated");
      } catch (err) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          toast.error("Failed to update item");
        }
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">Title *</Label>
            <Input id="edit-title" name="title" defaultValue={item.title} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-type">Type</Label>
              <select
                id="edit-type"
                name="type"
                defaultValue={item.type}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-time">Time</Label>
              <Input id="edit-time" name="startTime" type="time" defaultValue={item.startTime ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-location">Location</Label>
            <Input id="edit-location" name="locationName" defaultValue={item.locationName ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-cost">Cost estimate</Label>
              <Input id="edit-cost" name="costEstimate" type="number" min="0" step="0.01" defaultValue={item.costEstimate ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-url">Booking link</Label>
              <Input id="edit-url" name="bookingUrl" type="url" defaultValue={item.bookingUrl ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input id="edit-notes" name="notes" defaultValue={item.notes ?? ""} />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
