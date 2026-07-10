"use client";

import { useRef, useState } from "react";
import { X, Heart, PlusCircle, Users, MessageCircle, MoreHorizontal, Star } from "lucide-react";
import type { ScoredPlace } from "@/lib/discovery/score";
import { shortLocality } from "@/lib/places/short-locality";

/**
 * Phase 6 §5-G — tap-to-full-screen. Immersive photo view with the
 * TikTok-style right action stack; swipe up/down walks the ranked feed;
 * back/X returns to the feed at the same scroll position (the feed stays
 * mounted underneath).
 */
export function PlaceFullScreen({
  places, index, liked, likeCounts, onLike, onAdd, onCrew, onThread, onMore, onNavigate, onClose,
}: {
  places: ScoredPlace[];
  index: number;
  liked: Set<string>;
  likeCounts: Record<string, number>;
  onLike: (s: ScoredPlace) => void;
  onAdd: (s: ScoredPlace) => void;
  onCrew: (s: ScoredPlace) => void;
  onThread: (s: ScoredPlace) => void;
  onMore: (s: ScoredPlace) => void;
  onNavigate: (nextIndex: number) => void;
  onClose: () => void;
}) {
  const s = places[index];
  const startY = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  if (!s) return null;
  const p = s.place;
  const photo = p.photoRef ? `/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=1400` : null;
  const isLiked = liked.has(p.placeId);
  const count = likeCounts[p.placeId] ?? 0;

  function down(e: React.PointerEvent) {
    startY.current = e.clientY;
  }
  function move(e: React.PointerEvent) {
    if (startY.current == null) return;
    setDy(e.clientY - startY.current);
  }
  function up() {
    if (startY.current == null) return;
    const d = dy;
    startY.current = null;
    setDy(0);
    if (d < -80 && index < places.length - 1) onNavigate(index + 1); // swipe up → next
    else if (d > 80) {
      if (index > 0) onNavigate(index - 1); // swipe down → previous
      else onClose(); // …or dismiss from the first card
    }
  }

  const actions = [
    { key: "heart", icon: Heart, label: count > 0 ? String(count) : "", active: isLiked, color: "#FF375F", onClick: () => onLike(s) },
    { key: "add", icon: PlusCircle, label: "", active: false, color: "#34C759", onClick: () => onAdd(s) },
    { key: "crew", icon: Users, label: "", active: false, color: "#6B5CE7", onClick: () => onCrew(s) },
    { key: "thread", icon: MessageCircle, label: "", active: false, color: "#6B5CE7", onClick: () => onThread(s) },
    { key: "more", icon: MoreHorizontal, label: "", active: false, color: "#6B5CE7", onClick: () => onMore(s) },
  ];

  return (
    <div
      className="fixed inset-0 z-[75] bg-black touch-none select-none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{ transform: dy !== 0 ? `translateY(${dy * 0.3}px)` : undefined, transition: dy === 0 ? "transform 200ms ease" : "none" }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-violet-900/50" />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 40%, rgba(0,0,0,0.85))" }} />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-0 end-2 z-10 w-11 h-11 flex items-center justify-center text-white"
        style={{ marginTop: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        <X size={22} />
      </button>

      {/* Right action stack. */}
      <div className="absolute end-3 bottom-32 z-10 flex flex-col items-center gap-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.key} type="button" onClick={(e) => { e.stopPropagation(); a.onClick(); }} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
              >
                <Icon size={21} color={a.active ? a.color : "white"} fill={a.active ? a.color : "none"} strokeWidth={1.75} />
              </span>
              {a.label && <span className="text-[11px] font-semibold text-white">{a.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom meta. */}
      <div className="absolute inset-x-0 bottom-0 z-10 ps-5 pe-20 pb-10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 40px)" }}>
        <h2 className="text-white" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>{p.name}</h2>
        <p className="text-white/80 text-[14px] mt-1.5 inline-flex items-center gap-1.5">
          {p.rating != null && (
            <>
              <Star size={13} className="fill-amber-300 text-amber-300" /> {p.rating.toFixed(1)} ·
            </>
          )}
          {[shortLocality(p.address), p.category].filter(Boolean).join(" · ")}
        </p>
        <p className="text-white/40 text-[11px] mt-3">
          Swipe up for the next one · {index + 1}/{places.length}
        </p>
      </div>
    </div>
  );
}
