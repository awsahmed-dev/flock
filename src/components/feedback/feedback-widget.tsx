"use client";

import { useState, useTransition, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquarePlus, X, Send, Check } from "lucide-react";
import { sendFeedback } from "@/lib/actions/feedback";
import { toast } from "sonner";

/**
 * Floating "Feedback" button + modal. Mounted on authenticated pages only
 * (the parent decides — see Providers for the gate).
 *
 * UX choices:
 *   - Single-step form; no email/name field because we already have those
 *     on the server side from the session.
 *   - Emoji rating + body field. Both optional individually but at least
 *     one must be present (server enforces).
 *   - "It's OK to email me back" check is opt-in, defaults off. Defaults
 *     matter for privacy-respecting tools.
 *   - The current page URL is auto-attached so users don't have to say
 *     "I was on the trip page" — we already know.
 *   - Send hits a server action that emails hello@paxawa.com via Resend.
 *     No DB row; founder email is the source of truth pre-launch.
 */

const RATINGS: Array<{ value: number; emoji: string; label: string }> = [
  { value: 1, emoji: "😞", label: "Bad" },
  { value: 2, emoji: "😐", label: "Meh" },
  { value: 3, emoji: "🙂", label: "OK" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🤩", label: "Great" },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [wantsReply, setWantsReply] = useState(false);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setRating(null);
    setBody("");
    setWantsReply(false);
    setSent(false);
  }

  function close() {
    setOpen(false);
    // Brief delay before reset so the modal exit animation doesn't show
    // a blank form mid-fade.
    setTimeout(reset, 250);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    if (rating != null) fd.set("rating", String(rating));
    fd.set("body", body);
    fd.set("path", pathname ?? "(unknown)");
    fd.set("wantsReply", wantsReply ? "true" : "false");
    startTransition(async () => {
      const res = await sendFeedback(fd);
      if (res.ok) {
        setSent(true);
        toast.success(res.message);
        setTimeout(close, 1500);
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <>
      {/* Floating launcher button. Slim pill at bottom-right above the
          mobile bottom-nav (which has its own safe-area inset). */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-30 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background hover:opacity-90 shadow-lg shadow-black/30 px-3.5 py-2 text-xs font-bold transition-opacity"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        Feedback
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {sent ? (
                <div className="px-6 py-10 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="font-bold text-base">Thanks — got it.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reading every note.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div>
                      <p className="text-sm font-bold">Send feedback</p>
                      <p className="text-[11px] text-muted-foreground">
                        Goes straight to the founder
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="px-5 py-5 space-y-4">
                    {/* Rating */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        How's it going?
                      </p>
                      <div className="flex items-center gap-1.5">
                        {RATINGS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() =>
                              setRating(rating === r.value ? null : r.value)
                            }
                            className={`flex-1 inline-flex flex-col items-center gap-0.5 rounded-lg py-2 text-xl transition-colors ${
                              rating === r.value
                                ? "bg-primary/10 ring-1 ring-primary/40"
                                : "bg-muted/40 hover:bg-muted/60"
                            }`}
                            title={r.label}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              {r.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Body */}
                    <div>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="What worked, what didn't, what's missing — anything."
                        rows={4}
                        maxLength={4000}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 transition-colors resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground/70 mt-1 text-right tabular-nums">
                        {body.length}/4000
                      </p>
                    </div>

                    {/* Reply opt-in */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wantsReply}
                        onChange={(e) => setWantsReply(e.target.checked)}
                        className="w-4 h-4 rounded border-border accent-primary"
                      />
                      <span className="text-xs text-muted-foreground">
                        It's OK to reply to me by email
                      </span>
                    </label>
                  </div>

                  <div className="px-5 pb-5">
                    <button
                      type="submit"
                      disabled={isPending || (!body.trim() && rating == null)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-primary to-violet-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-bold text-white transition-opacity"
                    >
                      {isPending ? (
                        "Sending…"
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Send to founder
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
