"use client";

import { PackingBoard } from "@/components/packing/packing-board";

interface Document {
  id: string;
  tripId: string;
  type: "pdf" | "link" | "image";
  url: string;
  title: string;
  description: string | null;
  dayDate: string | null;
  uploadedBy: string;
  createdAt: Date;
  uploader?: { displayName: string } | null;
}

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
  initialView: "docs" | "packing";
  documents: Document[];
  packing: PackingItem[];
  members: Member[];
}

/**
 * Pack tab (Bug 4). A pure packing checklist — PackingBoard already renders the
 * progress bar, category-grouped items with checkboxes, and the add-item row.
 * The old Docs/Photos segment was removed: the reinvention's MANAGE tabs are
 * Expenses · Bookings · Pack, and Pack means packing. (`documents`, `isOwner`
 * and `initialView` remain on the props so the page's call site is unchanged;
 * they're simply no longer surfaced here.)
 */
export function PackBoard({ tripId, userId, packing, members }: Props) {
  return (
    <div className="px-4 max-w-2xl mx-auto">
      <PackingBoard tripId={tripId} userId={userId} items={packing} members={members} />
    </div>
  );
}
