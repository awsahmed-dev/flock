"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Backpack } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
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

      {/* Mobile only: segmented control between Docs and Packing.
          On lg+ both render side by side so the toggle is unnecessary.
          Uses the canonical full-width SegmentedControl so the tap
          targets clear 40px (the old hand-rolled p-0.5 toggle was ~26px
          tall with 12px icons). The Docs/Packing counts are appended to
          the label so the single badge slot stays free for the ratio. */}
      <div className="lg:hidden">
        <SegmentedControl<View>
          aria-label={t("pack.title")}
          value={view}
          onChange={switchTo}
          options={[
            { value: "docs", label: `${t("pack.docs")} · ${docsCount}`, icon: FileText },
            {
              value: "packing",
              label: `${t("pack.packing")} · ${totalPacking > 0 ? `${packedCount}/${totalPacking}` : "0"}`,
              icon: Backpack,
            },
          ]}
        />
      </div>

      {/* On lg+ render both panels side by side with a small section
          header strip for each. Mobile keeps the segmented control above
          and shows one panel at a time. */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        <div className={view === "docs" ? "block" : "hidden lg:block"}>
          <div className="hidden lg:flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("pack.docs")} · {docsCount}
            </h3>
          </div>
          <DocumentsBoard
            tripId={tripId}
            userId={userId}
            isOwner={isOwner}
            documents={documents}
            embedded
          />
        </div>
        <div className={view === "packing" ? "block" : "hidden lg:block"}>
          <div className="hidden lg:flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Backpack className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("pack.packing")} ·{" "}
              {totalPacking > 0 ? `${packedCount}/${totalPacking}` : "0"}
            </h3>
          </div>
          <PackingBoard
            tripId={tripId}
            userId={userId}
            items={packing}
            members={members}
            embedded
          />
        </div>
      </div>
    </div>
  );
}
