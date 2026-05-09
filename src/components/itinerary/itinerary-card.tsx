"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

const TYPE_CONFIG = {
  activity:      { icon: Ticket,    bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", label: "Activity" },
  accommodation: { icon: Bed,       bg: "bg-blue-100 dark:bg-blue-950/40",     text: "text-blue-600 dark:text-blue-400",    label: "Stay"     },
  transport:     { icon: Car,       bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400",label: "Transport" },
  meal:          { icon: Utensils,  bg: "bg-green-100 dark:bg-green-950/40",   text: "text-green-600 dark:text-green-400",  label: "Meal"     },
  other:         { icon: HelpCircle,bg: "bg-muted/60",                         text: "text-muted-foreground",               label: "Other"    },
} as const;

const STATUS_CONFIG = {
  proposed:  { dot: "bg-amber-400",   ring: "ring-amber-400/30",  label: "Proposed"  },
  confirmed: { dot: "bg-emerald-500", ring: "ring-emerald-500/30",label: "Confirmed" },
  rejected:  { dot: "bg-red-400",     ring: "ring-red-400/30",    label: "Rejected"  },
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

  const style = { transform: CSS.Transform.toString(transform), transition };

  const typeCfg = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.other;
  const statusCfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.proposed;
  const TypeIcon = typeCfg.icon;

  function handleStatusChange(status: "proposed" | "confirmed" | "rejected") {
    const optimistic = { ...item, status };
    onOptimisticUpdate?.(optimistic);
    startTransition(async () => {
      try { await updateItemStatus(item.id, tripId, status); }
      catch {
        onOptimisticUpdate?.(item);
        toast.error("Failed to update status");
      }
    });
  }

  function handleDelete() {
    onOptimisticDelete?.(item.id);
    startTransition(async () => {
      try { await deleteItineraryItem(item.id, tripId); }
      catch { toast.error("Failed to delete item"); }
    });
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group bg-card border border-border/60 rounded-xl p-3 flex gap-2.5 hover:border-border hover:shadow-sm transition-all",
          isSortableDragging && "opacity-40",
          isDragging && "shadow-xl rotate-1 opacity-90 border-primary/30",
          item.status === "rejected" && "opacity-50"
        )}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing mt-1 touch-none transition-colors"
          tabIndex={-1}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Type icon */}
        <div className={`w-8 h-8 rounded-lg ${typeCfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <TypeIcon className={`w-3.5 h-3.5 ${typeCfg.text}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {/* Title + status dot */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = item.status === "proposed" ? "confirmed"
                      : item.status === "confirmed" ? "rejected" : "proposed";
                    handleStatusChange(next);
                  }}
                  title={`${statusCfg.label} — click to cycle`}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1 transition-all focus:outline-none mt-px",
                    statusCfg.dot, statusCfg.ring
                  )}
                />
                <span className={cn(
                  "font-medium text-sm leading-tight",
                  item.status === "rejected" && "line-through text-muted-foreground"
                )}>
                  {item.title}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {item.startTime && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 shrink-0" />
                    {item.startTime.slice(0, 5)}
                  </span>
                )}
                {item.locationName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground max-w-[140px] truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {item.locationName}
                  </span>
                )}
                {item.costEstimate != null && (
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
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
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2 italic">
                  {item.notes}
                </p>
              )}
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted shrink-0 -mt-0.5 -mr-0.5">
                    <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleStatusChange("confirmed")} className="gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Confirm
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("proposed")} className="gap-2">
                  <Circle className="w-3.5 h-3.5 text-amber-500" /> Mark proposed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("rejected")} className="gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-500" /> Reject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditing(true)} className="gap-2">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
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
