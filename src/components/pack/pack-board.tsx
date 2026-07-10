"use client";

import { PackingBoard } from "@/components/packing/packing-board";
import { AddDocumentDialog } from "@/components/documents/add-document-dialog";
import { DocumentCard } from "@/components/documents/document-card";

interface Document {
  id: string;
  tripId: string;
  type: string;
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
 * Pack tab. Packing checklist on top; Sprint 5 PART-2 restores the Documents
 * section below it — the reinvention had amputated the docs viewer while the
 * composer kept writing rows nobody could see (the app's one feature with
 * organic real-trip usage). Cards sort day-pinned first, then undated.
 */
export function PackBoard({ tripId, userId, packing, members, documents }: Props) {
  const sortedDocs = [...documents].sort((a, b) => {
    if (a.dayDate && b.dayDate) return a.dayDate.localeCompare(b.dayDate);
    if (a.dayDate) return -1;
    if (b.dayDate) return 1;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  return (
    <div className="px-4 max-w-2xl mx-auto">
      <PackingBoard tripId={tripId} userId={userId} items={packing} members={members} />

      {/* Sprint 5 PART-2: the documents viewer, back from the dead. */}
      <section id="docs" className="mt-8 pb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">Documents</h2>
            <p className="text-xs text-muted-foreground">Confirmations, tickets, visas — one tap to open</p>
          </div>
          <AddDocumentDialog tripId={tripId} />
        </div>
        {sortedDocs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing here yet — add a booking confirmation or ticket.
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedDocs.map((d) => (
              <li key={d.id}>
                <DocumentCard
                  doc={{ id: d.id, title: d.title, type: d.type, url: d.url, dayDate: d.dayDate, uploaderName: d.uploader?.displayName ?? null }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
