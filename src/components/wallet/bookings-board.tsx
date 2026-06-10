"use client";

import { useState } from "react";
import {
  MapPin,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { useT } from "@/components/i18n/locale-provider";
import { BookMode } from "@/components/itinerary/book-mode";
import { WalletBoard } from "@/components/wallet/wallet-board";
import { MOCK_BOOKINGS } from "@/components/wallet/mock-bookings";

interface Props {
  tripId: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  members: number;
  currency: string;
  locale: "en" | "ar";
  userId: string;
  days: string[];
  items: {
    id: string;
    type: string;
    dayDate: string;
    title: string;
    locationName: string | null;
  }[];
}

/**
 * B24-followup: unified Bookings page. Replaces the earlier stacked
 * BookMode + WalletBoard layout (which the user correctly called a lazy
 * stitch — two competing page headers, two separate max-w wrappers, no
 * shared spend metric).
 *
 * Architecture:
 *   - One trip-context header at the top (name · destination · dates)
 *   - One large spend tile + progress (booked vs to-book)
 *   - Two collapsible-by-section blocks:
 *       1. "Still to book" — wraps BookMode in embedded mode
 *       2. "Booked" — wraps WalletBoard in embedded mode
 *   - One forward-emails footer hint
 *
 * BookMode + WalletBoard both grew an `embedded` prop that suppresses
 * their own page-level headers/totals/footers so they slot in cleanly.
 */
export function BookingsBoard(props: Props) {
  const t = useT();
  const [openSection, setOpenSection] = useState<"todo" | "booked">("todo");

  const totalSpend = MOCK_BOOKINGS.reduce((s, b) => s + b.price, 0);
  const walletCurrency = MOCK_BOOKINGS[0]?.currency ?? props.currency;
  const bookedCount = MOCK_BOOKINGS.length;

  const dateRange = `${format(parseDateOnly(props.startDate), "d MMM")} – ${format(parseDateOnly(props.endDate), "d MMM yyyy")}`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="font-bold text-foreground truncate">{props.tripName}</span>
          <span>·</span>
          <span className="truncate">{props.destination}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {dateRange}
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-violet-500/8 to-fuchsia-500/10 border border-primary/20 p-5 sm:p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-primary mb-1">
            {t("bookings.totalLabel")}
          </p>
          <p className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none">
            {walletCurrency} {totalSpend.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t("bookings.totalSubline", { count: bookedCount })}
          </p>
        </div>
      </header>

      <SectionBlock
        id="todo"
        open={openSection === "todo"}
        onToggle={(id) => setOpenSection((s) => (s === id ? "booked" : id))}
        accent="from-primary to-violet-600"
        accentBg="bg-primary/10"
        accentText="text-primary"
        title={t("bookings.todoTitle")}
        subtitle={t("bookings.todoSub")}
      >
        <BookMode
          tripId={props.tripId}
          destination={props.destination}
          startDate={props.startDate}
          endDate={props.endDate}
          members={props.members}
          currency={props.currency}
          locale={props.locale}
          days={props.days}
          items={props.items}
          embedded
        />
      </SectionBlock>

      <SectionBlock
        id="booked"
        open={openSection === "booked"}
        onToggle={(id) => setOpenSection((s) => (s === id ? "todo" : id))}
        accent="from-emerald-500 to-teal-600"
        accentBg="bg-emerald-500/10"
        accentText="text-emerald-600 dark:text-emerald-400"
        title={t("bookings.bookedTitle")}
        subtitle={t("bookings.bookedSub", { count: bookedCount })}
      >
        <WalletBoard
          userId={props.userId}
          tripName={props.tripName}
          destination={props.destination}
          startDate={props.startDate}
          endDate={props.endDate}
          embedded
        />
      </SectionBlock>

      <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-snug">{t("wallet.forwardTitle")}</p>
          <p className="text-[11px] text-muted-foreground truncate">{t("wallet.forwardSub")}</p>
        </div>
        <button
          type="button"
          className="text-[11px] font-bold text-primary hover:opacity-80 shrink-0"
        >
          {t("wallet.copyAddress")}
        </button>
      </div>

      <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground px-1 leading-relaxed">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>{t("plan.disclosure")}</span>
      </p>
    </div>
  );
}

function SectionBlock({
  id,
  open,
  onToggle,
  accent,
  accentBg,
  accentText,
  title,
  subtitle,
  children,
}: {
  id: "todo" | "booked";
  open: boolean;
  onToggle: (id: "todo" | "booked") => void;
  accent: string;
  accentBg: string;
  accentText: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-start"
        aria-expanded={open}
      >
        <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shrink-0 text-white text-xs font-extrabold shadow-md`}>
          {id === "todo" ? "1" : "2"}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold tracking-widest uppercase ${accentText}`}>
            {title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <div className={`w-7 h-7 rounded-full ${accentBg} flex items-center justify-center shrink-0`}>
          {open ? (
            <ChevronUp className={`w-3.5 h-3.5 ${accentText}`} />
          ) : (
            <ChevronDown className={`w-3.5 h-3.5 ${accentText}`} />
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-border/60 p-4 sm:p-5 bg-background/40">
          {children}
        </div>
      )}
    </section>
  );
}
