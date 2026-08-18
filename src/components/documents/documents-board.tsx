"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { AddDocumentDialog } from "./add-document-dialog";
import { deleteDocument } from "@/lib/actions/documents";
import { toast } from "sonner";
import { FolderOpen, LinkSimple as Link2, ArrowSquareOut as ExternalLink, Trash as Trash2, FileText, Image as ImageIcon, Files, X } from "@phosphor-icons/react/dist/ssr";
import { format } from "@/lib/i18n/date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/components/i18n/locale-provider";

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
  const t = useT();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const fd = new FormData();
    fd.set("documentId", doc.id);
    fd.set("tripId", doc.tripId);
    startTransition(async () => {
      try {
        await deleteDocument(fd);
        toast.success(t("docs.removed"));
      } catch {
        toast.error(t("docs.removeFailed"));
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
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mt-0.5">
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

      <div className="flex items-center gap-0.5 shrink-0 -me-1.5">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Open link"
          aria-label="Open link"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            title="Remove"
            aria-label="Remove"
          >
            <Trash2 className="w-4 h-4" />
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {photos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpen(p)}
          className="text-left group"
          title={p.title}
        >
          <div className="aspect-square rounded-xl overflow-hidden bg-muted relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {p.dayDate && (
              <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                {format(new Date(p.dayDate + "T00:00:00"), "MMM d")}
              </span>
            )}
          </div>
          {/* B12: title + description below thumbnail. Before, photos
              were dropped into the grid with no caption — users wrote
              titles and descriptions on upload and they just vanished. */}
          <p className="mt-1.5 text-xs font-semibold text-foreground line-clamp-1">
            {p.title}
          </p>
          {p.description && (
            <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2 leading-snug">
              {p.description}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}

function Lightbox({ photo, onClose }: { photo: Document; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.title}
        className="max-w-full max-h-[calc(100vh-9rem)] object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
      {/* B12: title + description caption. Was missing — users uploaded
          a photo with "Hotel confirmation - check-in 3pm" and never saw
          it again. */}
      {(photo.title || photo.description) && (
        <div
          className="mt-4 max-w-2xl w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-bold text-white">{photo.title}</p>
          {photo.description && (
            <p className="mt-1 text-xs text-white/80 leading-relaxed">
              {photo.description}
            </p>
          )}
          {photo.dayDate && (
            <p className="mt-1 text-[12px] text-white/60">
              {format(new Date(photo.dayDate + "T00:00:00"), "EEE, MMM d")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function DocumentsBoard({ tripId, userId, isOwner, documents: docs, embedded }: Props) {
  const t = useT();
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

  const tabs: Array<{ id: "all" | "photos" | "files"; labelKey: string; count: number; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "all", labelKey: "common.all", count: docs.length, icon: Files },
    { id: "photos", labelKey: "docs.tabPhotos", count: photos.length, icon: ImageIcon },
    { id: "files", labelKey: "docs.tabFiles", count: files.length, icon: FileText },
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
          title={t("docs.pageTitle")}
          subtitle={t("docs.pageSubtitle")}
          action={<AddDocumentDialog tripId={tripId} />}
        />
      )}

      {/* View tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/60 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                active
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(tab.labelKey)}
              <span
                className={`text-[12px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                  active ? "bg-primary/15 text-primary" : "bg-muted-foreground/15"
                }`}
              >
                {tab.count}
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
