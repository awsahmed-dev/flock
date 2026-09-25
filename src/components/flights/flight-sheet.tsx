"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Airplane,
  AirplaneLanding,
  AirplaneTakeoff,
  ArrowSquareOut,
  CircleNotch,
  Scan,
  Trash,
} from "@phosphor-icons/react/dist/ssr";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/locale-provider";
import { createClient } from "@/lib/supabase/client";
import { protectedFileUrl } from "@/lib/storage-url";
import { readFlightFromFile } from "@/lib/read-ticket";
import { addTicketDocument, removeFlight, saveFlight, type Flight } from "@/lib/actions/flights";
import { refused } from "@/lib/actions/refusal";

/**
 * One flight, editable. Opens empty (add), with a flight (edit), or with a
 * ticket already in Documents that nobody has read yet (read → fill → save).
 *
 * "Read a ticket" uploads the file, files it with the trip's documents, and
 * runs it through the same reader that handles forwarded confirmation
 * emails. The fields it fills stay editable — it's a head start, not a
 * decision — and nothing is saved until the person presses Save.
 */
export interface SeedTicket {
  url: string;
  title: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  tripId: string;
  tripStart: string;
  tripEnd: string;
  flight: Flight | null;
  seedTicket?: SeedTicket | null;
}

type Fields = {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
  confirmation: string;
};

const empty = (tripStart: string): Fields => ({
  flightNumber: "",
  airline: "",
  origin: "",
  destination: "",
  departDate: tripStart,
  departTime: "",
  arriveDate: "",
  arriveTime: "",
  confirmation: "",
});

const fromFlight = (f: Flight): Fields => ({
  flightNumber: f.flightNumber ?? "",
  airline: f.airline ?? "",
  origin: f.origin ?? "",
  destination: f.destination ?? "",
  departDate: f.departDate,
  departTime: f.departTime ?? "",
  arriveDate: f.arriveDate ?? "",
  arriveTime: f.arriveTime ?? "",
  confirmation: f.confirmation ?? "",
});

export function FlightSheet({ open, onClose, onChanged, tripId, tripStart, tripEnd, flight, seedTicket }: Props) {
  const t = useT();
  const [f, setF] = useState<Fields>(() => (flight ? fromFlight(flight) : empty(tripStart)));
  const [ticketUrl, setTicketUrl] = useState<string | null>(flight?.ticketUrl ?? seedTicket?.url ?? null);
  const [reading, setReading] = useState(false);
  const [filled, setFilled] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const autoRead = useRef<string | null>(null);

  // Reset whenever the sheet is pointed at something new.
  useEffect(() => {
    if (!open) return;
    setF(flight ? fromFlight(flight) : empty(tripStart));
    setTicketUrl(flight?.ticketUrl ?? seedTicket?.url ?? null);
    setFilled(false);
  }, [open, flight, seedTicket, tripStart]);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function apply(p: Awaited<ReturnType<typeof readFlightFromFile>>) {
    if (!p.ok) {
      toast.error(
        t(
          p.reason === "tooBig" ? "flights.fileTooBig" : p.reason === "busy" ? "flights.readBusy" : "flights.readFailed",
        ),
      );
      return;
    }
    const x = p.flight;
    setF((s) => ({
      flightNumber: x.title || s.flightNumber,
      airline: x.provider ?? s.airline,
      origin: x.from ?? s.origin,
      destination: x.to ?? s.destination,
      departDate: x.date ?? s.departDate,
      departTime: x.time ?? s.departTime,
      arriveDate: x.endDate ?? s.arriveDate,
      arriveTime: x.endTime ?? s.arriveTime,
      confirmation: x.confirmation ?? s.confirmation,
    }));
    setFilled(true);
  }

  /** A ticket already in Documents: fetch it through the proxy and read it. */
  useEffect(() => {
    if (!open || !seedTicket || flight || autoRead.current === seedTicket.url) return;
    autoRead.current = seedTicket.url;
    (async () => {
      setReading(true);
      try {
        const res = await fetch(seedTicket.url);
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        apply(await readFlightFromFile(Object.assign(blob, { name: seedTicket.title }), { tripStart, tripEnd }));
      } catch {
        toast.error(t("flights.readFailed"));
      } finally {
        setReading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedTicket, flight]);

  async function onPick(file: File) {
    setReading(true);
    try {
      // Upload first, so the ticket is kept even if reading it fails.
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("auth");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "ticket";
      const path = `${user.id}/${tripId}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from("trip-documents")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
      if (error) {
        toast.error(t("flights.uploadFailed"));
        return;
      }
      const url = protectedFileUrl("trip-documents", path);
      setTicketUrl(url);
      void addTicketDocument(tripId, url, file.name || t("flights.ticket"), f.departDate || null);
      apply(await readFlightFromFile(file, { tripStart, tripEnd }));
    } catch {
      toast.error(t("flights.uploadFailed"));
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save() {
    start(async () => {
      const r = await saveFlight({
        tripId,
        stopId: flight?.stopId ?? null,
        flightNumber: f.flightNumber,
        airline: f.airline || null,
        origin: f.origin || null,
        destination: f.destination || null,
        departDate: f.departDate,
        departTime: f.departTime || null,
        arriveDate: f.arriveDate || null,
        arriveTime: f.arriveTime || null,
        confirmation: f.confirmation || null,
        ticketUrl,
      });
      if (refused(r)) {
        toast.error(t(r.error));
        return;
      }
      toast.success(t("flights.saved"));
      onChanged();
      onClose();
    });
  }

  function remove() {
    if (!flight) return;
    if (!window.confirm(t("flights.removeConfirm"))) return;
    start(async () => {
      const r = await removeFlight(tripId, flight.stopId);
      if (refused(r)) {
        toast.error(t(r.error));
        return;
      }
      toast.success(t("flights.removed"));
      onChanged();
      onClose();
    });
  }

  const input =
    "w-full min-w-0 rounded-xl border border-border bg-card px-3 h-12 text-[15px] outline-none focus:ring-2 focus:ring-primary/40";
  const label = "block text-[12px] font-bold text-muted-foreground mb-1";
  const readOnly = flight ? !flight.canEdit : false;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={flight ? t("flights.editTitle") : t("flights.addTitle")}
      subtitle={t("flights.sheetHint")}
      size="md"
    >
      <div className="space-y-4 pb-1">
        {/* Read a ticket — the head start */}
        {!readOnly && (
          <div className="rounded-2xl border border-border bg-muted/30 p-3">
            <button
              type="button"
              disabled={reading || pending}
              onClick={() => fileRef.current?.click()}
              className="w-full h-12 rounded-full border border-primary/50 text-primary font-bold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {reading ? <CircleNotch className="w-5 h-5 animate-spin" /> : <Scan className="w-5 h-5" />}
              {reading ? t("flights.reading") : ticketUrl ? t("flights.readAnother") : t("flights.readTicket")}
            </button>
            <p className="mt-2 text-[12px] text-muted-foreground text-center">
              {filled ? t("flights.readDone") : t("flights.readHint")}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onPick(file);
              }}
            />
          </div>
        )}

        <fieldset disabled={readOnly || pending} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="fl-number">{t("flights.flightNumber")}</label>
              <input id="fl-number" dir="ltr" value={f.flightNumber} onChange={set("flightNumber")} placeholder="SV 826" className={input} />
            </div>
            <div>
              <label className={label} htmlFor="fl-airline">{t("flights.airline")}</label>
              <input id="fl-airline" value={f.airline} onChange={set("airline")} placeholder={t("flights.airlinePh")} className={input} />
            </div>
          </div>

          {/* The route. Left→right in both languages, like the Horizon —
              a flight reads from origin to destination on every ticket. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2" dir="ltr">
            <div>
              <label className={label} htmlFor="fl-from">{t("flights.from")}</label>
              <input id="fl-from" value={f.origin} onChange={set("origin")} placeholder="KUL" className={`${input} uppercase`} />
            </div>
            <Airplane className="w-5 h-5 mb-3.5 text-muted-foreground" />
            <div>
              <label className={label} htmlFor="fl-to">{t("flights.to")}</label>
              <input id="fl-to" value={f.destination} onChange={set("destination")} placeholder="RUH" className={`${input} uppercase`} />
            </div>
          </div>

          <div className="rounded-2xl border border-border p-3 space-y-3">
            <p className="flex items-center gap-2 text-[13px] font-bold">
              <AirplaneTakeoff className="w-4 h-4 text-muted-foreground" /> {t("flights.departs")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input aria-label={t("flights.departs")} type="date" value={f.departDate} onChange={set("departDate")} className={input} />
              <input aria-label={t("common.time")} type="time" value={f.departTime} onChange={set("departTime")} className={input} />
            </div>
            <p className="flex items-center gap-2 text-[13px] font-bold">
              <AirplaneLanding className="w-4 h-4 text-muted-foreground" /> {t("flights.arrives")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input aria-label={t("flights.arrives")} type="date" value={f.arriveDate} min={f.departDate} onChange={set("arriveDate")} className={input} />
              <input aria-label={t("common.time")} type="time" value={f.arriveTime} onChange={set("arriveTime")} className={input} />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="fl-ref">{t("flights.confirmation")}</label>
            <input id="fl-ref" dir="ltr" value={f.confirmation} onChange={set("confirmation")} placeholder="7XK9QP" className={`${input} uppercase tracking-wider`} />
          </div>
        </fieldset>

        {ticketUrl && (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 h-12 px-4 rounded-2xl border border-border text-[14px] font-semibold"
          >
            <ArrowSquareOut className="w-5 h-5 text-primary" />
            <span className="flex-1">{t("flights.viewTicket")}</span>
          </a>
        )}

        {readOnly ? (
          <p className="text-[12px] text-muted-foreground text-center">{t("flights.errNotYours")}</p>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              disabled={pending || reading}
              onClick={save}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {pending ? t("common.saving") : t("flights.save")}
            </button>
            {flight && (
              <button
                type="button"
                disabled={pending}
                onClick={remove}
                className="w-full h-12 rounded-full text-[14px] font-semibold text-destructive inline-flex items-center justify-center gap-2"
              >
                <Trash className="w-4 h-4" /> {t("flights.remove")}
              </button>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
