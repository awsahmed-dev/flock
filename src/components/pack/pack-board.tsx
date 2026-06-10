"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Backpack } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsBoard } from "@/components/documents/documents-board";
import { PackingBoard } from "@/components/packing/packing-board";
import { useT } from "@/components/i18n/locale-provider";

type View = "docs" | "packing";

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
  initialView: View;
  documents: Document[];
  packing: PackingItem[];
  members: Member[];
}

/**
 * B6: merged Docs + Packing tab. Single PageHeader, segmented control
 * switches between the two sub-views. URL ?view= is kept in sync via
 * router.replace so the back button restores the last view.
 *
 * Each sub-view's existing component (DocumentsBoard / PackingBoard) is
 * embedded as-is — they own their own state, dialogs, etc. The wrapper
 * just hosts the chrome.
 */
export function PackBoard({
  tripId,
  userId,
  isOwner,
  initialView,
  documents,
  packing,
  members,
}: Props) {
  const router = useRouter();
  const t = useT();
  const [view, setView] = useState<View>(initialView);
  const [, startTransition] = useTransition();

  function switchTo(v: View) {
    if (v === view) return;
    setView(v);
    // Reflect the active sub-view in the URL so refresh + back work.
    // router.replace inside a transition keeps the focus state predictable.
    startTransition(() => {
      router.replace(`/trips/${tripId}/pack?view=${v}`, { scroll: false });
    });
  }

  const docsCount = documents.length;
  const packedCount = packing.filter((p) => p.packed).length;
  const totalPacking = packing.length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("pack.title")}
        subtitle={t("pack.subtitle")}
      />

      {/* B6: segmented control between Docs and Packing. The active tab
          shows live counts so the user can see at a glance whether
          either side has anything in it. */}
      <div className="inline-flex items-center rounded-full border border-border p-0.5 bg-muted/40">
        <button
          type="button"
          onClick={() => switchTo("docs")}
          aria-pressed={view === "docs"}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
            view === "docs"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-3 h-3" />
          {t("pack.docs")}
          <span className={`tabular-nums ${view === "docs" ? "opacity-80" : "opacity-60"}`}>
            · {docsCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => switchTo("packing")}
          aria-pressed={view === "packing"}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
            view === "packing"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Backpack className="w-3 h-3" />
          {t("pack.packing")}
          <span className={`tabular-nums ${view === "packing" ? "opacity-80" : "opacity-60"}`}>
            · {totalPacking > 0 ? `${packedCount}/${totalPacking}` : "0"}
          </span>
        </button>
      </div>

      {/* B6: render the existing boards inside. They already have their
          own tabs (All / Photos / Files for docs; Shared / Yours / Crew
          for packing) and dialogs. We just hide whichever isn't active. */}
      <div className={view === "docs" ? "block" : "hidden"}>
        <DocumentsBoard
          tripId={tripId}
          userId={userId}
          isOwner={isOwner}
          documents={documents}
          embedded
        />
      </div>
      <div className={view === "packing" ? "block" : "hidden"}>
        <PackingBoard
          tripId={tripId}
          userId={userId}
          items={packing}
          members={members}
          embedded
        />
      </div>
    </div>
  );
}
