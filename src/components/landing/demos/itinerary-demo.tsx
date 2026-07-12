"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { DotsSixVertical as GripVertical, Sparkle as Sparkles, ForkKnife as Utensils, MapPin, Coffee, MusicNotes as Music } from "@phosphor-icons/react/dist/ssr";
import { DemoFrame, DemoHeader } from "./demo-frame";

/**
 * Interactive Itinerary demo. 4 day-3 cards pre-seeded. User drags any
 * card by its handle to reorder — the order is real local state, the
 * cards animate into their new slot, the times stay sticky to the slot
 * (not the card), so reordering visually "shuffles what happens when."
 *
 * Adds a small "AI drafted ✨" pill that fades in 600ms after mount as a
 * lightweight nod to the planner feature without an actual API call.
 */

type Slot = "9:30am" | "11:30am" | "1:00pm" | "8:00pm";

interface Item {
  id: string;
  title: string;
  location: string;
  cost: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

const SLOTS: Slot[] = ["9:30am", "11:30am", "1:00pm", "8:00pm"];

const INITIAL: Item[] = [
  {
    id: "breakfast",
    title: "Coffee at % Arabica",
    location: "Shibuya",
    cost: "~$8/pp",
    icon: Coffee,
    iconColor: "text-amber-300",
  },
  {
    id: "temple",
    title: "Senso-ji Temple",
    location: "Asakusa",
    cost: "Free",
    icon: MapPin,
    iconColor: "text-fuchsia-300",
  },
  {
    id: "lunch",
    title: "Tonkatsu at Maisen",
    location: "Aoyama",
    cost: "~$22/pp",
    icon: Utensils,
    iconColor: "text-emerald-300",
  },
  {
    id: "karaoke",
    title: "Karaoke at Karaoke-kan",
    location: "Shinjuku",
    cost: "~$15/pp",
    icon: Music,
    iconColor: "text-violet-300",
  },
];

export function ItineraryDemo() {
  const [items, setItems] = useState<Item[]>(INITIAL);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === active.id);
      const to = prev.findIndex((i) => i.id === over.id);
      return from === -1 || to === -1 ? prev : arrayMove(prev, from, to);
    });
  }

  return (
    <DemoFrame toneClass="from-blue-500/[0.07] to-indigo-500/[0.04]">
      <DemoHeader title="Tokyo trip · day 3" subtitle="Mon, Mar 16" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded-full px-2 py-0.5"
        >
          <Sparkles className="w-2.5 h-2.5" />
          AI drafted · drag to reorder
        </motion.div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, i) => (
                <SortableRow key={item.id} item={item} slot={SLOTS[i]} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <p className="text-center text-xs text-blue-300/80 pt-2">
          ↑ Try dragging a card by its grip handle
        </p>
      </div>
    </DemoFrame>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function SortableRow({ item, slot }: { item: Item; slot: Slot }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        // Lift the card on drag so it floats above the rest.
        zIndex: isDragging ? 10 : "auto",
      }}
      className={`flex items-center gap-2.5 rounded-xl border bg-white/[0.04] p-2.5 ${
        isDragging
          ? "border-blue-400/60 shadow-2xl shadow-blue-500/20"
          : "border-white/[0.08]"
      } transition-shadow`}
    >
      {/* Time gutter — sticks to the slot position, not the card content,
          so reordering visually shuffles what happens when. */}
      <div className="shrink-0 w-12 text-right">
        <p className="text-[10px] font-bold tracking-wide text-white/40 uppercase">
          {slot}
        </p>
      </div>

      <div
        className={`w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0`}
      >
        <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-white/40">{item.location}</p>
          <span className="text-white/15">·</span>
          <p className="text-[10px] font-semibold text-emerald-300/80">
            {item.cost}
          </p>
        </div>
      </div>

      {/* Drag handle */}
      <button
        type="button"
        className={`shrink-0 p-1 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors cursor-grab active:cursor-grabbing ${
          isDragging ? "text-blue-300" : ""
        }`}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
    </div>
  );
}
