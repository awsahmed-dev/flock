"use client";

import { useTransition } from "react";
import { AddDocumentDialog } from "./add-document-dialog";
import { deleteDocument } from "@/lib/actions/documents";
import { toast } from "sonner";
import { FolderOpen, Link2, ExternalLink, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  tripId: string;
  type: "pdf" | "link" | "image";
  url: string;
  title: string;
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
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

export function DocumentsBoard({ tripId, userId, isOwner, documents: docs }: Props) {
  // Group by dayDate
  const pinned = docs.filter((d) => d.dayDate);
  const general = docs.filter((d) => !d.dayDate);

  // Sort pinned by dayDate
  const pinnedSorted = [...pinned].sort(
    (a, b) => new Date(a.dayDate!).getTime() - new Date(b.dayDate!).getTime()
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Links, booking confirmations, and reference docs
          </p>
        </div>
        <AddDocumentDialog tripId={tripId} />
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No documents yet</p>
          <p className="text-xs mt-1">
            Add Google Docs, booking links, visa info, anything useful
          </p>
        </div>
      ) : (
        <>
          {/* General docs */}
          {general.length > 0 && (
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

          {/* Day-pinned docs */}
          {pinnedSorted.length > 0 && (
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
        </>
      )}
    </div>
  );
}
