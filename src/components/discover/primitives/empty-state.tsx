import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical designed empty state — icon in a soft tile, a one-line value prop,
 * and an optional single action. The design canon forbids flat gray blanks
 * (design §2/§4.5). Strings are passed in already-localized by the caller.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed border-border/60 px-6 py-12 text-center flex flex-col items-center",
        className,
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-muted-foreground/50" />
        </div>
      )}
      <p className="font-semibold text-sm">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
