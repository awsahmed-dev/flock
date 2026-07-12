"use client";

import { ArrowSquareOut as ExternalLink } from "@phosphor-icons/react/dist/ssr";
import { parseDateOnly } from "@/lib/date-only";
import { format } from "@/lib/i18n/date-fns";
import { docKindIcon } from "@/lib/document-kind";

export interface DocumentCardData {
  id: string;
  title: string;
  type: string | null;
  url: string;
  dayDate: string | null;
  uploaderName?: string | null;
}

/**
 * Sprint 5 §3d — THE document card, shared by the Pack docs section, the
 * PLANNING cockpit strip, the itinerary day rows, and the LIVE day view.
 * Exactly four things, in scan order: kind icon → title → day → open.
 * Uploader is a quiet suffix. No description, no metadata noise.
 */
export function DocumentCard({ doc, dayLabel }: { doc: DocumentCardData; dayLabel?: string | null }) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl bg-card border border-border px-3 h-14 active:scale-[0.99] transition-transform"
    >
      <span aria-hidden className="text-xl leading-none shrink-0 w-7 text-center">
        {docKindIcon(doc.type)}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold truncate">{doc.title}</span>
        {(dayLabel || doc.uploaderName) && (
          <span className="block text-[11px] text-muted-foreground truncate">
            {[dayLabel, doc.uploaderName].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
      {doc.dayDate && !dayLabel && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold tabular-nums">
          {format(parseDateOnly(doc.dayDate), "d MMM")}
        </span>
      )}
      <ExternalLink size={14} className="text-tertiary shrink-0" />
    </a>
  );
}
