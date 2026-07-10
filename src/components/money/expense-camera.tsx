"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Keyboard, Camera } from "lucide-react";
import { toast } from "sonner";
import { createCameraExpense } from "@/lib/actions/expenses";
import { convert, type RateBundle } from "@/lib/fx";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { CockpitCrew } from "@/components/trips/cockpit/types";

const CATEGORIES = ["food", "transport", "accommodation", "activity", "shopping", "other"] as const;

type Screen = "camera" | "review" | "split";

/**
 * Phase 6 §8-B — Point-and-Split. Screen 1: camera with a receipt frame
 * guide (⌨ type-instead fallback, honest permission-denied state).
 * Screen 2: OCR result, tap-editable. Screen 3: crew split with live
 * per-head math. Full-screen; the nav is hidden by covering it.
 */
export function ExpenseCamera({
  tripId, tripCurrency, currentUserId, fxRates, crew,
}: {
  tripId: string;
  tripCurrency: string;
  currentUserId: string;
  fxRates: RateBundle | null;
  crew: CockpitCrew[];
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("camera");
  const [camError, setCamError] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(tripCurrency);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("food");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(crew.map((m) => m.userId)));
  const [pending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera lifecycle.
  useEffect(() => {
    if (screen !== "camera") return;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCamError(true));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [screen]);

  async function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setOcrBusy(true);
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, mediaType: "image/jpeg" }),
      });
      const parsed = res.ok ? await res.json() : { amount: null };
      if (parsed.amount != null) {
        setAmount(String(parsed.amount));
        if (parsed.currency) setCurrency(parsed.currency);
        if (parsed.merchant) setDescription(parsed.merchant);
      } else {
        toast("Couldn't read that one — type the amount");
      }
      setScreen("review");
    } catch {
      toast("Couldn't read that one — type the amount");
      setScreen("review");
    } finally {
      setOcrBusy(false);
    }
  }

  function submit() {
    const amt = parseFloat(amount);
    const members = crew.filter((m) => selected.has(m.userId));
    if (!(amt > 0) || members.length === 0) return;
    const per = Math.round((amt / members.length) * 100) / 100;
    startTransition(() => {
      createCameraExpense({
        tripId,
        title: description.trim() || "Expense",
        amount: amt,
        currency,
        category,
        shares: members.map((m) => ({ userId: m.userId, amount: per })),
      })
        .then(() => {
          toast.success(
            `Logged ${currency} ${amt.toLocaleString()} · ${description.trim() || "Expense"} — split ${members.length} ways`,
          );
          router.push(`/trips/${tripId}/money`);
        })
        .catch((e) => toast.error(e?.message ?? "Couldn't log that"));
    });
  }

  const amt = parseFloat(amount) || 0;
  const perHead = selected.size > 0 ? amt / selected.size : 0;
  const perHeadBase =
    currency !== tripCurrency ? convert(perHead, currency, tripCurrency, fxRates) : null;

  return (
    <div className="fixed inset-0 z-[80] bg-background text-foreground flex flex-col">
      {/* Close. */}
      <div className="shrink-0 flex items-center justify-between px-3 h-[52px]" style={{ marginTop: "env(safe-area-inset-top)" }}>
        <button
          type="button"
          onClick={() => router.push(`/trips/${tripId}/money`)}
          aria-label="Close"
          className="w-11 h-11 flex items-center justify-center"
        >
          <X size={20} />
        </button>
        <p className="font-bold text-[15px]">
          {screen === "camera" ? "Point at the bill" : screen === "review" ? "Check the numbers" : "Split it"}
        </p>
        <span className="w-11" />
      </div>

      {/* SCREEN 1 — CAMERA. */}
      {screen === "camera" && (
        <div className="flex-1 relative flex flex-col">
          {camError ? (
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
              <Camera size={28} className="text-muted-foreground" />
              <p className="font-semibold">Paxawa can&rsquo;t see the bill.</p>
              <p className="text-[13px] text-muted-foreground">
                Allow camera access in Settings, or type the amount instead.
              </p>
              <button
                type="button"
                onClick={() => setScreen("review")}
                className="mt-2 rounded-full bg-primary text-white text-[14px] font-bold px-5 py-2.5"
              >
                Type instead
              </button>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              {/* Receipt frame guide. */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="rounded-2xl"
                  style={{ width: 280, height: 380, border: "2px solid var(--clr-wayfind)", boxShadow: "0 0 0 100vmax rgba(0,0,0,0.35)" }}
                />
              </div>
              <div
                className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 pb-8"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}
              >
                <button
                  type="button"
                  onClick={capture}
                  disabled={ocrBusy}
                  aria-label="Capture"
                  className="w-[72px] h-[72px] rounded-full bg-white ring-4 ring-white/40 active:scale-95 transition-transform disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setScreen("review")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-black/50 text-white text-[13px] font-semibold px-4 py-2"
                  style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                >
                  <Keyboard size={14} /> Type instead
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* SCREEN 2 — REVIEW. */}
      {screen === "review" && (
        <div className="flex-1 overflow-y-auto px-5 pt-4 flex flex-col gap-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
          <div>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              autoFocus={!amount}
              className="w-full bg-transparent text-[40px] font-extrabold tabular-nums outline-none placeholder:text-muted-foreground/40"
            />
            <div className="flex gap-2 mt-1 overflow-x-auto scrollbar-none">
              {[currency, tripCurrency, "USD", "EUR"]
                .filter((c, i, arr) => arr.indexOf(c) === i)
                .map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-bold border ${
                      currency === c ? "border-primary text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Category</p>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-semibold capitalize border ${
                    category === c ? "border-primary text-primary" : "border-border text-muted-foreground"
                  }`}
                  style={category === c ? { background: "var(--accent-glow)" } : undefined}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Description</p>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner at Jalan Alor"
              className="w-full h-12 rounded-2xl border border-border bg-card px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>

          <button
            type="button"
            onClick={() => setScreen("split")}
            disabled={!(amt > 0)}
            className="h-13 rounded-2xl bg-primary text-white font-bold text-[15px] py-3.5 disabled:opacity-50"
          >
            Next — split it
          </button>
        </div>
      )}

      {/* SCREEN 3 — SPLIT. */}
      {screen === "split" && (
        <div className="flex-1 overflow-y-auto px-5 pt-4 flex flex-col gap-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            {crew.map((m) => {
              const on = selected.has(m.userId);
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (on) next.delete(m.userId);
                      else next.add(m.userId);
                      return next;
                    })
                  }
                  className={`flex flex-col items-center gap-1.5 transition-opacity ${on ? "" : "opacity-35"}`}
                >
                  <span className={`rounded-full ${on ? "ring-[3px] ring-primary" : ""}`}>
                    <UserAvatar name={m.displayName} avatarUrl={m.avatarUrl} seed={m.userId} size="xl" />
                  </span>
                  <span className="text-[12px] font-semibold">
                    {m.userId === currentUserId ? "You" : m.displayName.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-center text-[15px] font-bold tabular-nums">
            {currency} {perHead.toFixed(2)} each
            {perHeadBase != null && (
              <span className="text-muted-foreground font-normal"> ≈ {tripCurrency} {perHeadBase.toFixed(2)}</span>
            )}
          </p>

          <button
            type="button"
            onClick={submit}
            disabled={pending || selected.size === 0 || !(amt > 0)}
            className="h-13 rounded-2xl bg-primary text-white font-bold text-[15px] py-3.5 disabled:opacity-50"
          >
            {pending ? "Logging…" : "Split it"}
          </button>
        </div>
      )}
    </div>
  );
}
