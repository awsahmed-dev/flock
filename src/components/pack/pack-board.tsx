"use client";

import { PackingBoard } from "@/components/packing/packing-board";

interface PackingItem {
  id: string;
  label: string;
  category: string;
  packed: boolean;
  notes: string | null;
  userId: string | null;
  createdBy: string;
}

interface Member {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface Props {
  tripId: string;
  userId: string;
  isOwner: boolean;
  packing: PackingItem[];
  members: Member[];
}

/**
 * Pack tab — packing only (Sprint 6 FIX-1: the Documents section moved to
 * Huddle's Docs segment; Huddle is the coordination hub, Pack means packing).
 */
export function PackBoard({ tripId, userId, packing, members }: Props) {
  return (
    <div className="px-4 max-w-2xl mx-auto">
      <PackingBoard tripId={tripId} userId={userId} items={packing} members={members} />
    </div>
  );
}
