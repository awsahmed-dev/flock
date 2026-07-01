"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  /** Where the back button goes. Omit to hide the back arrow. */
  backHref?: string;
  /** Main heading. */
  title: string;
  /** Optional smaller subtitle below the title. */
  subtitle?: string;
  /** Optional CTA / action on the right side. */
  action?: React.ReactNode;
}

/**
 * B8: shared page-header pattern for trip sub-pages (money/transactions,
 * money/breakdown, money/balances, members, settings, etc).
 *
 * Previous pattern had a floating back-arrow chip sitting awkwardly to
 * the LEFT of the title (looked like it didn't belong). New pattern is
 * compact and predictable:
 *   - small inline back chevron that doubles as a click target on the
 *     title row itself
 *   - subtitle right under the title for context
 *   - optional action slot on the far right (button, link, etc.)
 */
export function PageHeader({ backHref, title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-3 mb-1">
      <div className="flex items-center gap-2.5 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="shrink-0 -ms-1 w-8 h-8 rounded-lg hover:bg-accent/40 flex items-center justify-center text-foreground hover:opacity-70 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate leading-snug mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
