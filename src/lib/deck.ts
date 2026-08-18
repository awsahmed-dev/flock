import type { TripMoment } from "@/lib/trip-moment";

/**
 * Now redesign, step 4 — the deck: what sits under the horizon.
 *
 * ONE photo hero + up to three one-line notes, ranked for THIS moment. Every
 * card answers "what's it like" or "what's next", never "how are my chores"
 * (the ticket and the horizon own chores). Pure and i18n-agnostic: it emits
 * keys + params; the cockpit renders with t(). Capped — a deck, not a feed.
 */
export type DeckHue = "horizon" | "dune" | "wayfind" | "brand";
export type DeckKind = "crewHeart" | "day1" | "weather" | "fx" | "money" | "invite" | "docs" | "crewPulse";

export interface DeckCard {
  kind: DeckKind;
  hue: DeckHue;
  /** i18n keys under cockpit.deck.* ; params are already computed */
  purposeKey: string;
  kickerKey?: string;
  titleKey: string;
  bodyKey: string;
  actionKey: string;
  params: Record<string, string | number>;
  href: string;
  /** hero-capable when present */
  photoUrl: string | null;
  /** phosphor icon name for the note tile */
  icon: "Heart" | "CalendarDots" | "Sun" | "CurrencyCircleDollar" | "Wallet" | "Users" | "FileText" | "ChatCircle";
  score: number;
}

export interface DeckInput {
  moment: TripMoment;
  base: string;
  destinationCity: string;
  startDate: string;
  heroImageUrl: string | null;
  crewCount: number;
  primaryKey: string;
  hearts: { placeId: string; name: string; photoUrl: string | null; hearts: number; onPlan: boolean }[];
  day1: { count: number; firstTime: string | null; firstTitle: string | null };
  weather: { tempMax: number; tempMin: number | null; key: string; sunset: string | null; isTripDay: boolean } | null;
  fx: { local: string; symbol: string; perUnit: number; base: string } | null;
  money: { currency: string; budget: number | null; perPerson: number | null; spent: number } ;
  docsCount: number;
  ticker: { text: string } | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function buildDeck(i: DeckInput): { hero: DeckCard | null; notes: DeckCard[] } {
  const cards: DeckCard[] = [];
  const m = i.moment;
  const push = (c: DeckCard) => cards.push(c);

  // Crew is deciding — the strongest hero pre-trip: a hearted place not on the plan.
  const heart = i.hearts.find((h) => !h.onPlan) ?? i.hearts[0];
  if (heart) {
    push({
      kind: "crewHeart", hue: "horizon", icon: "Heart",
      purposeKey: heart.onPlan ? "cockpit.deck.crewHeartOnPlanPurpose" : "cockpit.deck.crewHeartPurpose",
      kickerKey: "cockpit.deck.crewHeartKicker",
      titleKey: "cockpit.deck.crewHeartTitle", bodyKey: heart.onPlan ? "cockpit.deck.crewHeartOnPlanBody" : "cockpit.deck.crewHeartBody",
      actionKey: heart.onPlan ? "cockpit.deck.open" : "cockpit.deck.addToPlan",
      params: { name: heart.name, count: heart.hearts },
      href: heart.onPlan ? `${i.base}/itinerary` : `${i.base}/discover`,
      photoUrl: heart.photoUrl, score: 90,
    });
  }
  // Your day 1
  if (i.day1.count > 0) {
    push({
      kind: "day1", hue: "brand", icon: "CalendarDots",
      purposeKey: "cockpit.deck.day1Purpose", kickerKey: "cockpit.deck.day1Kicker",
      titleKey: i.day1.firstTitle ? "cockpit.deck.day1TitleNamed" : "cockpit.deck.day1Title",
      bodyKey: i.day1.firstTime ? "cockpit.deck.day1BodyTimed" : "cockpit.deck.day1Body",
      actionKey: "cockpit.deck.open",
      params: { count: i.day1.count, first: i.day1.firstTitle ?? "", time: i.day1.firstTime ?? "" },
      href: `${i.base}/itinerary?day=${i.startDate}`,
      photoUrl: i.heroImageUrl, score: m.phase === "DEPARTURE" ? 80 : 60,
    });
  }
  // Weather — "right now" far out, "on arrival" within 16 days
  if (i.weather) {
    push({
      kind: "weather", hue: "wayfind", icon: "Sun",
      purposeKey: i.weather.isTripDay ? "cockpit.deck.weatherArrivalPurpose" : "cockpit.deck.weatherNowPurpose",
      kickerKey: i.weather.isTripDay ? "cockpit.deck.weatherArrivalKicker" : "cockpit.deck.weatherNowKicker",
      titleKey: "cockpit.deck.weatherTitle",
      bodyKey: i.weather.sunset ? "cockpit.deck.weatherBodySunset" : "cockpit.deck.weatherBody",
      actionKey: "cockpit.deck.weatherAction",
      params: { city: i.destinationCity, temp: i.weather.tempMax, cond: i.weather.key, sunset: i.weather.sunset ?? "" },
      href: `${i.base}/pack`, photoUrl: null, score: i.weather.isTripDay ? 75 : 45,
    });
  }
  // FX
  if (i.fx) {
    push({
      kind: "fx", hue: "wayfind", icon: "CurrencyCircleDollar",
      purposeKey: "cockpit.deck.fxPurpose", titleKey: "cockpit.deck.fxTitle", bodyKey: "cockpit.deck.fxBody", actionKey: "cockpit.deck.open",
      params: { symbol: i.fx.symbol, local: i.fx.local, perUnit: i.fx.perUnit, base: i.fx.base },
      href: `${i.base}/money`, photoUrl: null, score: 35,
    });
  }
  // Money
  if (i.money.budget != null && i.money.budget > 0) {
    push({
      kind: "money", hue: "dune", icon: "Wallet",
      purposeKey: "cockpit.deck.moneyPurpose",
      titleKey: i.money.perPerson ? "cockpit.deck.moneyTitleEach" : "cockpit.deck.moneyTitle",
      bodyKey: i.money.spent > 0 ? "cockpit.deck.moneyBodySpent" : "cockpit.deck.moneyBodyNothing",
      actionKey: "cockpit.deck.open",
      params: { currency: i.money.currency, budget: fmt(i.money.budget), each: fmt(i.money.perPerson ?? 0), spent: fmt(i.money.spent) },
      href: `${i.base}/money`, photoUrl: null, score: 30,
    });
  }
  // Invite (only when the ticket isn't already the invite)
  if (i.crewCount < 2 && i.primaryKey !== "crew") {
    push({
      kind: "invite", hue: "brand", icon: "Users",
      purposeKey: "cockpit.deck.invitePurpose", titleKey: "cockpit.deck.inviteTitle", bodyKey: "cockpit.deck.inviteBody", actionKey: "cockpit.deck.share",
      params: {}, href: `${i.base}/members`, photoUrl: null, score: 70,
    });
  }
  // Docs — once due and none exist
  if (m.due.docs && i.docsCount === 0) {
    push({
      kind: "docs", hue: "horizon", icon: "FileText",
      purposeKey: "cockpit.deck.docsPurpose", titleKey: "cockpit.deck.docsTitle", bodyKey: "cockpit.deck.docsBody", actionKey: "cockpit.deck.add",
      params: {}, href: `${i.base}/huddle?tab=docs`, photoUrl: null, score: 78,
    });
  }
  // Crew pulse — the last thing the crew did
  if (i.ticker?.text) {
    push({
      kind: "crewPulse", hue: "brand", icon: "ChatCircle",
      purposeKey: "cockpit.deck.pulsePurpose", titleKey: "cockpit.deck.pulseTitle", bodyKey: "cockpit.deck.pulseBody", actionKey: "cockpit.deck.open",
      params: { text: i.ticker.text }, href: `${i.base}/huddle`, photoUrl: null, score: 50,
    });
  }

  cards.sort((a, b) => b.score - a.score);
  const hero = cards.find((c) => c.photoUrl) ?? null;
  const notes = cards.filter((c) => c !== hero).slice(0, 3);
  return { hero, notes };
}
