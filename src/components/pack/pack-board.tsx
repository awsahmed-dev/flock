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
  // P1-1: Packing is the page's namesake, so it's the default mode unless
  // the URL explicitly asked for docs.
  const [view, setView] = useState<View>(initialView ?? "packing");
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

  // P1-1: one overall progress/summary line that states where the page is
  // at a glance — packed ratio + doc count — instead of two competing
  // section headers.
  const progressLine = t("pack.progressLine", {
    packed: packedCount,
    total: totalPacking,
    docs: docsCount,
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* P1-1: ONE header stating the page's single job + ONE summary
          line. No second toolbar. */}
      <PageHeader title={t("pack.title")} subtitle={t("pack.subtitle")} />
      <p className="text-xs font-medium text-muted-foreground -mt-2">
        {progressLine}
      </p>

      {/* P1-1: ONE top-level segmented control (Packing | Docs) at every
          breakpoint — no more two tab systems crammed side by side on
          desktop. Each segment carries its own count; the body below
          switches to one mode at a time, and each mode owns exactly one
          primary "add" affordance (inside DocumentsBoard / PackingBoard).
          On mobile this naturally stacks into one scannable column. */}
      <SegmentedControl<View>
        aria-label={t("pack.title")}
        value={view}
        onChange={switchTo}
        options={[
          {
            value: "packing",
            label: `${t("pack.packing")} · ${totalPacking > 0 ? `${packedCount}/${totalPacking}` : "0"}`,
            icon: Backpack,
          },
          { value: "docs", label: `${t("pack.docs")} · ${docsCount}`, icon: FileText },
        ]}
      />

      <div>
        {view === "packing" ? (
          <PackingBoard
            tripId={tripId}
            userId={userId}
            items={packing}
            members={members}
            embedded
          />
        ) : (
          <DocumentsBoard
            tripId={tripId}
            userId={userId}
            isOwner={isOwner}
            documents={documents}
            embedded
          />
        )}
      </div>
    </div>
  );
}
