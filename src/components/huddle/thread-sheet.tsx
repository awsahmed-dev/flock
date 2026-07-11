"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getThread, addThreadComment, toggleTapback, type ThreadEntityType } from "@/lib/actions/threads";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import type { CockpitCrew } from "@/components/trips/cockpit/types";

const TAPBACKS = ["❤️", "😂", "👍", "😮", "🔥"];

interface Comment {
  id: string;
  content: string;
  tapbacks: Record<string, string[]>;
  createdAt: string;
  userId: string | null;
  authorName: string;
  authorAvatar: string | null;
}

/**
 * Phase 6 §4-C — the contextual ThreadSheet: an 85%-height bottom sheet
 * anchored to a place/stop/expense. Comments anchor to the bottom, the
 * input pins above the keyboard via visualViewport, long-press opens the
 * 5-emoji tapback bar, and @ summons the crew picker. Stacks above
 * whatever is open — the user never loses their place.
 */
export function ThreadSheet({
  tripId, entityType, entityId, title, subtitle, photoUrl, crew, onClose,
}: {
  tripId: string;
  entityType: ThreadEntityType;
  entityId: string;
  title: string;
  subtitle?: string;
  photoUrl?: string | null;
  crew: CockpitCrew[];
  onClose: () => void;
}) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [tapbackFor, setTapbackFor] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [kbOffset, setKbOffset] = useState(0);

  useEffect(() => {
    let alive = true;
    getThread(tripId, entityType, entityId)
      .then((res) => {
        if (!alive) return;
        setThreadId(res.threadId);
        setComments(res.comments);
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e6 }));
      })
      .catch(() => toast.error("Couldn't open the thread"));
    return () => { alive = false; };
  }, [tripId, entityType, entityId]);

  // visualViewport: pin the input above the soft keyboard; keep the list
  // anchored to the bottom when the user was already near it.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setKbOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
      const el = listRef.current;
      if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
        requestAnimationFrame(() => el.scrollTo({ top: 1e6 }));
      }
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  function send() {
    const body = draft.trim();
    if (!body || !threadId) return;
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      content: body,
      tapbacks: {},
      createdAt: new Date().toISOString(),
      userId: null,
      authorName: "You",
      authorAvatar: null,
    };
    setComments((prev) => [...prev, optimistic]);
    setDraft("");
    if (navigator.vibrate) navigator.vibrate(6);
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e6 }));
    startTransition(() => {
      addThreadComment(tripId, threadId, body).catch(() => {
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
        toast.error("Couldn't send that");
      });
    });
  }

  function tapback(commentId: string, emoji: string) {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const t = { ...c.tapbacks };
        const list = t[emoji] ?? [];
        t[emoji] = list.includes("me") ? list.filter((u) => u !== "me") : [...list, "me"];
        if (t[emoji].length === 0) delete t[emoji];
        return { ...c, tapbacks: t };
      }),
    );
    setTapbackFor(null);
    startTransition(() => {
      toggleTapback(tripId, commentId, emoji).catch(() => {});
    });
  }

  function onDraftChange(v: string) {
    setDraft(v);
    setMentionOpen(v.endsWith("@"));
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[70] flex flex-col rounded-t-[20px] bg-background border-t border-border"
        style={{ height: "85svh", paddingBottom: kbOffset }}
      >
        <div className="shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-9 h-1 rounded-full bg-foreground/20" />
        </div>

        {/* Anchor header. */}
        <div className="shrink-0 flex items-center gap-3 px-4 pb-3 border-b border-border">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="w-[72px] h-[54px] rounded-xl object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold truncate">{title}</p>
            {subtitle && <p className="text-[12px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 flex items-center justify-center text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Comments. */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
          {comments.length === 0 && (
            <p className="text-center text-[13px] text-muted-foreground py-8">
              First one in — say what you&rsquo;re thinking.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5 relative">
              <UserAvatar name={c.authorName} avatarUrl={c.authorAvatar} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-muted-foreground">
                  <span className="font-bold text-foreground">{c.authorName.split(" ")[0]}</span> ·{" "}
                  {dfFormat(new Date(c.createdAt), "MMM d")}
                </p>
                <button
                  type="button"
                  onContextMenu={(e) => { e.preventDefault(); setTapbackFor(c.id); }}
                  onPointerDown={(e) => {
                    const timer = setTimeout(() => setTapbackFor(c.id), 400);
                    const clear = () => clearTimeout(timer);
                    e.currentTarget.addEventListener("pointerup", clear, { once: true });
                    e.currentTarget.addEventListener("pointerleave", clear, { once: true });
                  }}
                  className="text-start text-[14px] leading-relaxed mt-0.5"
                >
                  {c.content}
                </button>
                {Object.keys(c.tapbacks).length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {Object.entries(c.tapbacks).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => tapback(c.id, emoji)}
                        className="rounded-full bg-muted px-1.5 py-0.5 text-[12px]"
                      >
                        {emoji} {users.length > 1 ? users.length : ""}
                      </button>
                    ))}
                  </div>
                )}
                {tapbackFor === c.id && (
                  <div className="absolute z-10 mt-1 flex gap-1 rounded-full bg-card border border-border px-2 py-1 shadow-lg">
                    {TAPBACKS.map((e) => (
                      <button key={e} type="button" onClick={() => tapback(c.id, e)} className="text-[18px] px-1 active:scale-125 transition-transform">
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* @mention picker. */}
        {mentionOpen && (
          <div className="shrink-0 flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
            {crew.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => {
                  setDraft((d) => `${d}${m.displayName.split(" ")[0]} `);
                  setMentionOpen(false);
                  inputRef.current?.focus();
                }}
                className="shrink-0 flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5 text-[13px] font-semibold"
              >
                <UserAvatar name={m.displayName} avatarUrl={m.avatarUrl} seed={m.userId} size="xs" />
                {m.displayName.split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        {/* Input — visualViewport-pinned via the sheet's paddingBottom. */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-border" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Add a comment…"
            className="flex-1 h-11 rounded-full border border-border bg-muted px-4 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send"
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </>
  );
}
