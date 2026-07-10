"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { addBooking } from "@/lib/actions/bookings";
import { createClient } from "@/lib/supabase/client";

/**
 * Phase 6 §6-C — the Add Booking form. Opens from the [+] Add sheet's
 * "Add a booking" row (window event `paxawa:addBooking`). Creates the
 * anchor stop + bookings row; PDFs land in the trip-documents bucket.
 */
export function AddBookingSheet({ tripId, days }: { tripId: string; days: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"flight" | "stay" | "other">("flight");
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [dayDate, setDayDate] = useState(days[0] ?? "");
  const [time, setTime] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [nights, setNights] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openSheet = () => setOpen(true);
    window.addEventListener("paxawa:addBooking", openSheet);
    return () => window.removeEventListener("paxawa:addBooking", openSheet);
  }, []);

  async function uploadPdf(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${tripId}/bookings/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("trip-documents")
        .upload(path, file, { cacheControl: "3600", contentType: file.type || "application/pdf" });
      if (error) throw error;
      const { data } = supabase.storage.from("trip-documents").getPublicUrl(path);
      setPdfUrl(data.publicUrl);
      toast.success("PDF attached");
    } catch {
      toast.error("Couldn't upload that PDF");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    startTransition(() => {
      addBooking({
        tripId,
        type,
        name,
        providerName: provider || null,
        dayDate,
        time: time || null,
        confirmationNumber: confirmation || null,
        nights: type === "stay" && nights ? parseInt(nights, 10) || null : null,
        pdfUrl,
      })
        .then(() => {
          toast.success(`${name.trim()} added to the plan`);
          setOpen(false);
          setName(""); setProvider(""); setConfirmation(""); setNights(""); setPdfUrl(null); setTime("");
          router.refresh();
        })
        .catch((e) => toast.error(e?.message ?? "Couldn't add that booking"));
    });
  }

  const field =
    "w-full h-12 rounded-2xl border border-border bg-background px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <BottomSheet open={open} onClose={() => setOpen(false)} title="Add a booking" size="md">
      <div className="flex flex-col gap-3 pb-2">
        {/* Type segmented control. */}
        <div className="grid grid-cols-3 rounded-2xl bg-muted p-1">
          {(["flight", "stay", "other"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setType(k)}
              className={`h-10 rounded-xl text-[13px] font-bold capitalize transition-colors ${
                type === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {k === "stay" ? "Hotel" : k}
            </button>
          ))}
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "flight" ? "MH 073" : type === "stay" ? "Booking name" : "Train / bus / ferry…"} className={field} />
        <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={type === "stay" ? "Mandarin Oriental" : "Provider (optional)"} className={field} />

        <div className="flex gap-2">
          <select value={dayDate} onChange={(e) => setDayDate(e.target.value)} className={`${field} flex-1 appearance-none`}>
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${field} w-32`} aria-label={type === "stay" ? "Check-in time" : "Departure time"} />
        </div>

        <div className="flex gap-2">
          <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Confirmation # (optional)" className={`${field} flex-1`} />
          {type === "stay" && (
            <input inputMode="numeric" value={nights} onChange={(e) => setNights(e.target.value.replace(/\D/g, ""))} placeholder="Nights" className={`${field} w-24`} />
          )}
        </div>

        <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && uploadPdf(e.target.files[0])} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-12 rounded-2xl border border-dashed border-border text-[14px] font-semibold text-muted-foreground flex items-center justify-center gap-2"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          {pdfUrl ? "PDF attached ✓ — replace" : "Attach the PDF (optional)"}
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim() || !dayDate}
          className="h-13 rounded-2xl bg-primary text-white font-bold text-[15px] py-3.5 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add booking"}
        </button>
      </div>
    </BottomSheet>
  );
}
