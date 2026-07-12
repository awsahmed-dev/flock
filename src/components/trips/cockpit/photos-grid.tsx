"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react/dist/ssr";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";

interface Photo {
  id: string;
  title: string;
  dayDate: string;
  photoUrl: string;
}

/** Phase 6 §3-E panel 4 — 3-col photo grid, tap → lightbox. */
export function PhotosGrid({ tripId, tripName, photos }: { tripId: string; tripName: string; photos: Photo[] }) {
  const [open, setOpen] = useState<Photo | null>(null);

  return (
    <main className="bg-background text-foreground min-h-svh">
      <p className="px-4 pt-4 pb-2 font-bold text-[17px]">Photos</p>

      {photos.length === 0 ? (
        <div className="px-6 py-16 text-center text-muted-foreground">
          <p className="font-semibold text-foreground">No photos yet</p>
          <p className="text-sm mt-1">Places you visited will show their photos here.</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-1 p-1"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
        >
          {photos.map((p) => (
            <button key={p.id} type="button" onClick={() => setOpen(p)} className="relative aspect-square bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photoUrl} alt={p.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox. */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setOpen(null)}>
          <button type="button" aria-label="Close" className="absolute top-3 end-3 z-10 w-11 h-11 flex items-center justify-center text-white" style={{ marginTop: "env(safe-area-inset-top)" }}>
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.photoUrl} alt={open.title} className="flex-1 min-h-0 object-contain" />
          <div className="p-4 text-white" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
            <p className="font-bold">{open.title}</p>
            <p className="text-white/60 text-sm">{dfFormat(parseDateOnly(open.dayDate), "EEE d MMM yyyy")}</p>
          </div>
        </div>
      )}
    </main>
  );
}
