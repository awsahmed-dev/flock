"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin, Clock, Link2, GripVertical, MoreHorizontal,
  CheckCircle, XCircle, Circle, Pencil, Trash2,
  Utensils, Bed, Car, Ticket, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateItemStatus, deleteItineraryItem } from "@/lib/actions/itinerary";
import { EditItemDialog } from "./edit-item-dialog";
import { toast } from "sonner";
import type { InferSelectModel } from "drizzle-orm";
import type { itineraryItems } from "@/lib/db/schema";

type Item = InferSelectModel<typeof itineraryItems>;

interface Props {
  item: Item;
  tripId: string;
  currency: string;
  isDragging?: boolean;
  onOptimisticUpdate?: (item: Item) => void;
  onOptimisticDelete?: (id: string) => void;
}

const TYPE_ICONS = {
  activity: Ticket,
  accommodation: Bed,
  transport: Car,
  meal: Utensils,
  other: HelpCircle,
};

const STATUS_CONFIG = {
  proposed: { color: "bg-yellow-400", label: "Proposed" },
  confirmed: { color: "bg-green-500", label: "Confirmed" },
  rejected: { color: "bg-red-400", label: "Rejected" },
};

export function ItineraryCard({
  item,
  tripId,
  currency,
  isDragging,
  onOptimisticUpdate,
  onOptimisticDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const TypeIcon = TYPE_ICONS[item.type] ?? HelpCircle;
  const statusCfg = STATUS_CONFIG[item.status];

  function handleStatusChange(status: "proposed" | "confirmed" | "rejected") {
    const optimistic = { ...item, status };
    onOptimisticUpdate?.(optimistic);
    startTransition(async () => {
      try {
        await updateItemStatus(item.id, tripId, status);
      } catch {
        onOptimisticUpdate?.(item);
        toast.error("Failed to update status");
      }
    });
  }

  function handleDelete() {
    onOptimisticDelete?.(item.id);
    startTransition(async () => {
      try {
        await deleteItineraryItem(item.id, tripId);
      } catch {
        toast.error("Failed to delete item");
      }
    });
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "bg-background border border-border/60 rounded-lg p-3 flex gap-3 group",
          isSortableDragging && "opacity-40",
          isDragging && "shadow-lg rotate-1 opacity-90",
          item.status === "rejected" && "opacity-60"
        )}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing mt-0.5 touch-none"
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Status dot */}
        <button
          onClick={() => {
            const next = item.status === "proposed" ? "confirmed"
              : item.status === "confirmed" ? "rejected" : "proposed";
            handleStatusChange(next);
          }}
          className="shrink-0 mt-1 focus:outline-none"
          title={`Status: ${statusCfg.label} — click to change`}
        >
          <span className={cn("w-2.5 h-2.5 rounded-full block", statusCfg.color)} />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <TypeIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className={cn(
                  "font-medium text-sm",
                  item.status === "rejected" && "line-through text-muted-foreground"
                )}>
                  {item.title}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {item.startTime && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {item.startTime.slice(0, 5)}
                  </span>
                )}
                {item.locationName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[140px]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {item.locationName}
                  </span>
                )}
                {item.costEstimate && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {currency} {item.costEstimate.toLocaleString()}
                  </span>
                )}
                {item.bookingUrl && (
                  <a
                    href={item.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link2 className="w-3 h-3" /> Booking
                  </a>
                )}
              </div>

              {item.notes && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {item.notes}
                </p>
              )}
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted shrink-0">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleStatusChange("confirmed")} className="gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Confirm
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("proposed")} className="gap-2">
                  <Circle className="w-4 h-4 text-yellow-500" /> Mark proposed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("rejected")} className="gap-2">
                  <XCircle className="w-4 h-4 text-red-500" /> Reject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditing(true)} className="gap-2">
                  <Pencil className="w-4 h-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="gap-2 text-destructive focus:text-destructive"
                  data-variant="destructive"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {editing && (
        <EditItemDialog
          item={item}
          tripId={tripId}
          onClose={() => setEditing(false)}
          onUpdated={(updated) => {
            onOptimisticUpdate?.(updated);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
