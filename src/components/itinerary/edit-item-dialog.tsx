"use client";

import { useRef, useTransition } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateItineraryItem } from "@/lib/actions/itinerary";
import { CircleNotch as Loader2 } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import type { InferSelectModel } from "drizzle-orm";
import type { itineraryItems } from "@/lib/db/schema";
import { useT } from "@/components/i18n/locale-provider";

type Item = InferSelectModel<typeof itineraryItems>;

interface Props {
  item: Item;
  tripId: string;
  onClose: () => void;
  onUpdated: (item: Item) => void;
}

const TYPES = [
  { value: "activity", key: "addItem.typeActivity" },
  { value: "accommodation", key: "addItem.typeStay" },
  { value: "transport", key: "addItem.typeTransport" },
  { value: "meal", key: "addItem.typeMeal" },
  { value: "other", key: "addItem.typeOther" },
];

export function EditItemDialog({ item, tripId, onClose, onUpdated }: Props) {
  const [isPending, startTransition] = useTransition();
  const t = useT();

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
        toast.success(t("form.itemUpdated"));
      } catch (err) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          toast.error(t("form.failedToUpdateItem"));
        }
      }
    });
  }

  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={t("addItem.editItem")}
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => formRef.current?.requestSubmit()}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {t("addItem.saveChanges")}
          </Button>
        </div>
      }
    >
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">{t("common.title")} *</Label>
            <Input id="edit-title" name="title" defaultValue={item.title} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-type">{t("common.type")}</Label>
              <select
                id="edit-type"
                name="type"
                defaultValue={item.type}
                className="w-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{t(o.key)}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-time">{t("common.time")}</Label>
              <Input id="edit-time" name="startTime" type="time" defaultValue={item.startTime ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-location">{t("common.location")}</Label>
            <Input id="edit-location" name="locationName" defaultValue={item.locationName ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-cost">{t("common.costEstimate")}</Label>
              <Input id="edit-cost" name="costEstimate" type="number" min="0" step="0.01" defaultValue={item.costEstimate ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-url">{t("common.bookingLink")}</Label>
              <Input id="edit-url" name="bookingUrl" type="url" defaultValue={item.bookingUrl ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">{t("common.notes")}</Label>
            <Input id="edit-notes" name="notes" defaultValue={item.notes ?? ""} />
          </div>

        </form>
    </BottomSheet>
  );
}
