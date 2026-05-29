"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { AddDocumentDialog } from "./add-document-dialog";
import { deleteDocument } from "@/lib/actions/documents";
import { toast } from "sonner";
import {
  FolderOpen,
  Link2,
  ExternalLink,
  Trash2,
  FileText,
  Image as ImageIcon,
  Files,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";

interface Document {
  id: string;
  tripId: string;
  type: "pdf" | "link" | "image";
  url: string;
  title: string;
  /** B6: optional free-text caption shown beneath the title. */
  description: string | null;
  dayDate: string | null;
  uploadedBy: string;
  createdAt: Date;
  uploader?: { displayName: string } | null;
}

interface Props {
  tripId: string;
  userId: string;
  isOwner: boolean;
  documents: Document[];
  /** B6: when true, the board is rendered inside <PackBoard /> which
   *  already shows its own PageHeader. Hides the local header so we
   *  don't get a doubled-up title. */
  embedded?: boolean;
}

function DocumentCard({
  doc,
  userId,
  isOwner,
}: {
  doc: Document;
  userId: string;
  isOwner: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const fd = new FormData();
    fd.set("documentId", doc.id);
    fd.set("tripId", doc.tripId);
    startTransition(async () => {
      try {
        await deleteDocument(fd);
        toast.success("Removed");
      } catch {
        toast.error("Failed to remove");
      }
    });
  }

  const canDelete = doc.uploadedBy === userId || isOwner;

  const Icon = doc.type === "pdf" ? FileText : Link2;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 group">
      <div className="rounded-lg bg-muted p-2 shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{doc.title}</p>
        {/* B6: description shows under title when present. */}
        {doc.description && (
          <p className="text-xs text-foreground/80 mt-0.5 line-clamp-2 leading-snug">
            {doc.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          <span className="truncate">{doc.url}</span>
          {doc.dayDate && (
            <>
              <span>·</span>
              <span className="shrink-0">
                {format(new Date(doc.dayDate + "T00:00:00"), "MMM d")}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Open link"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: Document[];
  onOpen: (photo: Document) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {photos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpen(p)}
          className="aspect-square rounded-xl overflow-hidden bg-muted relative group"
          title={p.title}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.url}
            alt={p.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          {p.dayDate && (
            <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
              {format(new Date(p.dayDate + "T00:00:00"), "MMM d")}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function Lightbox({ photo, onClose }: { photo: Document; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.title}
        className="max-w-full max-h-full object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function DocumentsBoard({ tripId, userId, isOwner, documents: docs, embedded }: Props) {
  const searchParams = useSearchParams();
  const initialView =
    searchParams?.get("type") === "image" ? "photos" : "all";
  const [view, setView] = useState<"all" | "photos" | "files">(
    initialView as "all" | "photos",
  );
  const [lightbox, setLightbox] = useState<Document | null>(null);

  const photos = docs.filter((d) => d.type === "image");
  const files = docs.filter((d) => d.type !== "image");

  const pinned = files.filter((d) => d.dayDate);
  const general = files.filter((d) => !d.dayDate);
  const pinnedSorted = [...pinned].sort(
    (a, b) => new Date(a.dayDate!).getTime() - new Date(b.dayDate!).getTime(),
  );

  const tabs: Array<{ id: "all" | "photos" | "files"; label: string; count: number; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "all", label: "All", count: docs.length, icon: Files },
    { id: "photos", label: "Photos", count: photos.length, icon: ImageIcon },
    { id: "files", label: "Files", count: files.length, icon: FileText },
  ];

  const showPhotos = view === "all" || view === "photos";
  const showFiles = view === "all" || view === "files";

  return (
    <div className="space-y-6">
      {/* B8/B6: unified PageHeader — hidden when embedded inside PackBoard
          which owns the shared title strip. The Add CTA still needs to
          show in both modes, so we surface it in a thin top-right bar
          when embedded. */}
      {embedded ? (
        <div className="flex justify-end">
          <AddDocumentDialog tripId={tripId} />
        </div>
      ) : (
        <PageHeader
          title="Documents"
          subtitle="Photos, links, bookings, and reference docs"
          action={<AddDocumentDialog tripId={tripId} />}
        />
      )}

      {/* View tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted/60 w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              <span
                className={`text-[10px] tabular-nums px-1.5 rounded-full ${
                  active ? "bg-primary/15 text-primary" : "bg-muted-foreground/15"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No documents yet</p>
          <p className="text-xs mt-1">
            Add photos, Google Docs, booking links, visa info — anything useful
          </p>
        </div>
      ) : (
        <>
          {showPhotos && photos.length > 0 && (
            <section className="space-y-2.5">
              {view === "all" && (
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Photos · {photos.length}
                </h3>
              )}
              <PhotoGrid photos={photos} onOpen={setLightbox} />
            </section>
          )}

          {showFiles && general.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                General · {general.length}
              </h3>
              {general.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  userId={userId}
                  isOwner={isOwner}
                />
              ))}
            </section>
          )}

          {showFiles && pinnedSorted.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Pinned to days · {pinnedSorted.length}
              </h3>
              {pinnedSorted.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  userId={userId}
                  isOwner={isOwner}
                />
              ))}
            </section>
          )}

          {/* Empty state for a tab with nothing in it */}
          {view === "photos" && photos.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No photos yet</p>
              <p className="text-xs mt-1">
                Add image links and they'll show up here as a gallery
              </p>
            </div>
          )}
          {view === "files" && files.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No files yet</p>
            </div>
          )}
        </>
      )}

      {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
