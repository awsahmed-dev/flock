"use client";

import { useState } from "react";
import {
  MapPin,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { useT } from "@/components/i18n/locale-provider";
import { BookMode } from "@/components/itinerary/book-mode";
import { WalletBoard } from "@/components/wallet/wallet-board";
import { MOCK_BOOKINGS } from "@/components/wallet/mock-bookings";
import { StaysRail } from "@/components/wallet/stays-rail";

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
 * B24-r2: full Bookings redesign. The previous accordion version still
 * showed both lists at once (just collapsed) and the to-book CTAs
 * fought the booked cards for visual attention — the user called the
 * page "unusable" and "too crowded."
 *
 * New layout, inspired by the wallet/fintech references the user
 * shared:
 *   1. Trip-context breadcrumb (tiny, top)
 *   2. Hero spend card — clean white card with the total trip spend,
 *      eye-toggle for privacy, and a two-column snapshot of
 *      "Booked / To book" so the page communicates state at a glance
 *      without forcing the user to switch tabs first.
 *   3. Segmented pill control — [Booked · N][To book · N] — focuses
 *      attention. Only one section visible at a time = no more
 *      crowding.
 *   4. Filtered list area. Booked = beautiful WalletCards. To book =
 *      compact action rows (BookMode embedded).
 *   5. Forward-email hint + disclosure footer.
 *
 * Padding is fixed: this component no longer adds its own outer
 * `px-4 sm:px-6 py-6` — the trip shell already does that. We now slot
 * cleanly into the shell's `max-w-5xl` container with our own
 * `max-w-2xl` reading width.
 */
type Tab = "booked" | "todo";

export function BookingsBoard(props: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("booked");
  const [hideAmount, setHideAmount] = useState(false);

  const totalSpend = MOCK_BOOKINGS.reduce((s, b) => s + b.price, 0);
  // P1-2: present the booked figure in the TRIP's display currency (the
  // same basis Money uses), never the mock booking's own currency. This
  // is the fix for the "SAR 2,019 on Bookings vs USD 130.87 on Money"
  // trust-breaking conflict — Bookings reports *booking value*, not an
  // unqualified "trip total spend" (that number belongs to Money alone).
  const bookingCurrency = props.currency;
  const bookedCount = MOCK_BOOKINGS.length;
  const todoCount = computeTodoCount(props);

  const dateRange = `${format(parseDateOnly(props.startDate), "d MMM")} – ${format(parseDateOnly(props.endDate), "d MMM yyyy")}`;
  const formattedSpend = `${bookingCurrency} ${totalSpend.toLocaleString()}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 lg:max-w-none lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start lg:space-y-0">
      <div className="space-y-6 min-w-0">
      {/* P1-2: header states Bookings' single job in one line. */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{t("bookings.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("bookings.jobLine")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          <span className="font-bold text-foreground truncate">{props.tripName}</span>
        </span>
        <span>·</span>
        <span className="truncate">{props.destination}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {dateRange}
        </span>
      </div>

      {/* P1-2: ONE block. The Booked / To-book breakdown is shown exactly
          once — and the summary IS the tab control (clicking a stat
          switches the list below it). The previous design stacked a hero
          "Total trip spend" card with its own Booked/To-book split AND a
          second segmented Booked/To-book control underneath — two copies
          of the same thing. The "Booked value" figure (in the trip's
          currency) sits in the header, not as a "trip total spend" that
          would compete with Money. */}
      <div className="rounded-3xl bg-card border border-border/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-4 pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-0.5">
              {t("bookings.totalLabel")}
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-none">
              {hideAmount ? "••••••" : formattedSpend}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHideAmount((v) => !v)}
            className="w-9 h-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
            aria-label={hideAmount ? t("bookings.showAmount") : t("bookings.hideAmount")}
          >
            {hideAmount ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* The summary == the tab control. Each half is a tab. */}
        <div className="grid grid-cols-2 border-t border-border/60">
          <SummaryTab
            active={tab === "booked"}
            onClick={() => setTab("booked")}
            icon={CheckCircle2}
            tone="emerald"
            label={t("bookings.snapshotBooked")}
            count={bookedCount}
            sub={t("bookings.snapshotBookedSub")}
          />
          <SummaryTab
            active={tab === "todo"}
            onClick={() => setTab("todo")}
            icon={Clock}
            tone="amber"
            label={t("bookings.snapshotTodo")}
            count={todoCount}
            sub={t("bookings.snapshotTodoSub")}
          />
        </div>
      </div>

      {/* P6: real Stays discovery — the taste/discovery brain on the booking
          surface. Lazy-loaded; renders nothing if no hotels are found. */}
      <StaysRail tripId={props.tripId} destination={props.destination} />

      <div>
        {tab === "booked" ? (
          <WalletBoard
            userId={props.userId}
            tripName={props.tripName}
            destination={props.destination}
            startDate={props.startDate}
            endDate={props.endDate}
            embedded
          />
        ) : (
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
        )}
      </div>
      </div>
      {/* Right rail on lg+ — forward-email hint stacked over the
          affiliate disclosure. Sticks to the top of the viewport as
          the main list scrolls. On mobile both still flow under the
          list because the grid collapses. */}
      <div className="space-y-3 lg:sticky lg:top-6 lg:space-y-4">

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

      {tab === "todo" && (
        <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground px-1 leading-relaxed">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{t("plan.disclosure")}</span>
        </p>
      )}
      </div>
    </div>
  );
}

/**
 * P1-2: the Booked / To-book summary stat that is ALSO the tab control.
 * One affordance does both jobs — reports the count AND switches the list
 * below — so the page never shows the breakdown twice.
 */
function SummaryTab({
  active,
  onClick,
  icon: Icon,
  tone,
  label,
  count,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "amber";
  label: string;
  count: number;
  sub: string;
}) {
  const toneText =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-amber-700 dark:text-amber-400";
  const toneIcon =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-amber-600 dark:text-amber-400";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative text-start p-4 sm:p-5 transition-colors ${
        tone === "amber" ? "border-s border-border/60" : ""
      } ${active ? "bg-muted/40" : "hover:bg-muted/20"}`}
    >
      {/* Active underline indicator */}
      <span
        className={`absolute inset-x-0 bottom-0 h-0.5 transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        } ${tone === "emerald" ? "bg-emerald-500" : "bg-amber-500"}`}
        aria-hidden
      />
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${toneIcon}`} />
        <p className={`text-[10px] font-bold tracking-widest uppercase ${toneText}`}>
          {label}
        </p>
      </div>
      <p className="text-2xl font-extrabold tabular-nums leading-none">{count}</p>
      <p className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>
    </button>
  );
}

/**
 * Mirrors the to-book accounting that BookMode does internally — keeps
 * the snapshot tile + segmented control's count in sync with what the
 * user will actually see when they switch to the to-book tab.
 */
function computeTodoCount(props: Props): number {
  const accommodationItems = props.items.filter((i) => i.type === "accommodation");
  const cities = props.destination
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 5);
  const citiesWithoutHotel = cities.filter((city) => {
    const cityLower = city.toLowerCase();
    return !accommodationItems.some(
      (a) =>
        a.locationName?.toLowerCase().includes(cityLower) ||
        a.title.toLowerCase().includes(cityLower),
    );
  });
  const activityItems = props.items.filter(
    (i) => i.type === "activity" || i.type === "meal",
  );
  let n = 0;
  n += citiesWithoutHotel.length;
  n += 1;
  n += 1;
  n += Math.min(activityItems.length, 3);
  return n;
}
