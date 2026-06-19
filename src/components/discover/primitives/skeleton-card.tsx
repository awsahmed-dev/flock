import { cn } from "@/lib/utils";

/**
 * Loading skeleton that matches the real place card's shape (16:10 hero + two
 * text lines) — the design canon prefers shape-matched skeletons over spinners
 * (design §4.5). Used while the feed/search loads.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/60 overflow-hidden", className)}>
      <div className="aspect-[16/10] bg-muted animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-muted rounded animate-pulse" />
        <div className="h-2.5 w-2/3 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

/** A grid of skeleton cards matching the feed's responsive columns. */
export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-3 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
