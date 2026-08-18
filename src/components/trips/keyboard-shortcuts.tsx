"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Keyboard, X } from "@phosphor-icons/react/dist/ssr";

/**
 * Trip-scoped keyboard shortcuts. Mounted once inside TripShell.
 *
 * Active anywhere on a trip page except when the user is focused in an
 * input/textarea/contenteditable. Two flavors:
 *
 * 1. Single-key actions:
 *    `?`  → open this help overlay
 *    `c`  → toggle chat
 *    `/`  → focus the chat input
 *    `Esc`→ close chat (handled inside ChatSidebar already)
 *
 * 2. Two-key sequences (Vim-style "go to"):
 *    `g h` → home / overview
 *    `g i` → itinerary
 *    `g v` → votes
 *    `g e` → expenses
 *    `g d` → documents
 *    `g s` → settings
 */

interface Props {
  tripId: string;
  onToggleChat: () => void;
}

const NAV_TARGETS: Record<string, string> = {
  h: "",
  i: "/itinerary",
  v: "/decisions",
  e: "/expenses",
  // B6: Docs + Packing merged into /pack with a segmented control inside.
  // `d` jumps to the Docs view, `p` jumps to the Packing view.
  d: "/pack?view=docs",
  p: "/pack?view=packing",
  s: "/settings",
};

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "?", label: "Show this help" },
  { keys: "c", label: "Toggle chat" },
  { keys: "/", label: "Focus chat input" },
  { keys: "g h", label: "Go to overview" },
  { keys: "g i", label: "Go to itinerary" },
  { keys: "g v", label: "Go to decisions" },
  { keys: "g e", label: "Go to expenses" },
  { keys: "g d", label: "Go to documents" },
  { keys: "g p", label: "Go to packing" },
  { keys: "g s", label: "Go to settings" },
  { keys: "Esc", label: "Close chat / dialog" },
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts({ tripId, onToggleChat }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let pendingG = false;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPending() {
      pendingG = false;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    }

    function onKey(e: KeyboardEvent) {
      // Allow normal typing in any input
      if (isTypingTarget(e.target)) return;
      // Don't interfere with browser shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key;

      // Two-key "g …" sequences
      if (pendingG) {
        const dest = NAV_TARGETS[k.toLowerCase()];
        clearPending();
        if (dest !== undefined) {
          e.preventDefault();
          router.push(`/trips/${tripId}${dest}`);
          return;
        }
        return;
      }

      if (k === "g" || k === "G") {
        pendingG = true;
        pendingTimer = setTimeout(clearPending, 1200);
        return;
      }

      if (k === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (k === "c" || k === "C") {
        e.preventDefault();
        onToggleChat();
        return;
      }

      if (k === "/") {
        e.preventDefault();
        // Focus the first chat input on the page (shows up only when chat is open).
        const input = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
          'textarea[data-chat-input], input[data-chat-input]',
        );
        if (input) {
          input.focus();
        } else {
          // Fall through: open chat first, focus on next render
          onToggleChat();
          setTimeout(() => {
            const late = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
              'textarea[data-chat-input], input[data-chat-input]',
            );
            late?.focus();
          }, 350);
        }
      }
    }

    function onCustomShow() {
      setHelpOpen(true);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("paxawa:shortcuts:show", onCustomShow);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("paxawa:shortcuts:show", onCustomShow);
      clearPending();
    };
  }, [tripId, router, pathname, onToggleChat]);

  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/8 to-primary/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Keyboard shortcuts</p>
              <p className="text-[12px] text-muted-foreground">Press ? anytime to reopen</p>
            </div>
          </div>
          <button
            onClick={() => setHelpOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between py-1.5 text-sm"
            >
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.split(" ").map((k, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 text-[12px] font-bold font-mono rounded-md bg-muted border border-border text-foreground"
                  >
                    {k === "Esc" ? "Esc" : k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
