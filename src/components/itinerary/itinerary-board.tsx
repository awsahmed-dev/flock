"use client";

import { useState, useTransition, useOptimistic } from "react";
import { format, parseISO, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { ItineraryCard } from "./itinerary-card";
import { AddItemDialog } from "./add-item-dialog";
import { updateItemSortOrders } from "@/lib/actions/itinerary";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { InferSelectModel } from "drizzle-orm";
import type { itineraryItems } from "@/lib/db/schema";

type Item = InferSelectModel<typeof itineraryItems>;

interface Props {
  tripId: string;
  days: string[];
  items: Item[];
  currency: string;
}

export function ItineraryBoard({ tripId, days, items: initialItems, currency }: Props) {
  const [items, setItems] = useState(initialItems);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function getItemsForDay(day: string) {
    return items
      .filter((i) => i.dayDate === day)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeItem = items.find((i) => i.id === active.id);
    const overItem = items.find((i) => i.id === over.id);
    if (!activeItem || !overItem) return;

    const day = activeItem.dayDate;
    const dayItems = getItemsForDay(day);
    const oldIndex = dayItems.findIndex((i) => i.id === active.id);
    const newIndex = dayItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(dayItems, oldIndex, newIndex);
    const updates = reordered.map((item, idx) => ({ id: item.id, sortOrder: idx }));

    setItems((prev) => {
      const otherItems = prev.filter((i) => i.dayDate !== day);
      const updated = reordered.map((item, idx) => ({ ...item, sortOrder: idx }));
      return [...otherItems, ...updated];
    });

    startTransition(() => {
      updateItemSortOrders(updates, tripId);
    });
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const totalEstimated = items
    .filter((i) => i.status !== "rejected" && i.costEstimate)
    .reduce((sum, i) => sum + (i.costEstimate ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Itinerary</h2>
          {totalEstimated > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Estimated total: {currency} {totalEstimated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Proposed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Confirmed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Rejected
          </span>
        </div>
      </div>

      {/* Day columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-6">
          {days.map((day, idx) => {
            const dayItems = getItemsForDay(day);
            const parsed = parseISO(day);
            const today = isToday(parsed);

            return (
              <div key={day} className="flex flex-col gap-3">
                {/* Day header */}
                <div className="flex items-center gap-3">
                  <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 shrink-0 ${today ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30"}`}>
                    <span className="text-xs font-medium leading-none">{format(parsed, "EEE")}</span>
                    <span className="text-lg font-bold leading-tight">{format(parsed, "d")}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      Day {idx + 1} · {format(parsed, "MMMM d, yyyy")}
                      {today && <Badge className="ml-2 text-xs" variant="default">Today</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dayItems.length} item{dayItems.length !== 1 ? "s" : ""}
                      {dayItems.filter((i) => i.status === "confirmed").length > 0 &&
                        ` · ${dayItems.filter((i) => i.status === "confirmed").length} confirmed`}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="ml-15 pl-3 border-l-2 border-border/50 flex flex-col gap-2">
                  <SortableContext
                    items={dayItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {dayItems.map((item) => (
                      <ItineraryCard
                        key={item.id}
                        item={item}
                        tripId={tripId}
                        currency={currency}
                        onOptimisticUpdate={(updated) => {
                          setItems((prev) =>
                            prev.map((i) => (i.id === updated.id ? updated : i))
                          );
                        }}
                        onOptimisticDelete={(id) => {
                          setItems((prev) => prev.filter((i) => i.id !== id));
                        }}
                      />
                    ))}
                  </SortableContext>

                  {dayItems.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 italic">
                      Nothing planned yet
                    </p>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit gap-1.5 text-muted-foreground hover:text-foreground -ml-1 h-7"
                    onClick={() => setAddingDay(day)}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add item
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeItem && (
            <ItineraryCard
              item={activeItem}
              tripId={tripId}
              currency={currency}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      {addingDay && (
        <AddItemDialog
          tripId={tripId}
          dayDate={addingDay}
          sortOrder={getItemsForDay(addingDay).length}
          onClose={() => setAddingDay(null)}
          onAdded={(newItem) => {
            setItems((prev) => [...prev, newItem]);
            setAddingDay(null);
          }}
        />
      )}
    </div>
  );
}
