import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  real,
  pgEnum,
  date,
  time,
  jsonb,
  numeric,
  char,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const tripMemberRoleEnum = pgEnum("trip_member_role", ["owner", "member"]);
export const itineraryItemTypeEnum = pgEnum("itinerary_item_type", [
  "activity",
  "accommodation",
  "transport",
  "meal",
  "other",
]);
export const itineraryItemStatusEnum = pgEnum("itinerary_item_status", [
  "proposed",
  "confirmed",
  "rejected",
]);
export const voteStatusEnum = pgEnum("vote_status", ["open", "closed"]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "accommodation",
  "transport",
  "food",
  "activity",
  "shopping",
  "other",
]);
// B2 Budget v2 — "shared" = group expense, gets splits, counts toward
// trip cap. "personal" = pocket spend by one member, no splits, counts
// only toward that member's personal_budget.
export const expenseScopeEnum = pgEnum("expense_scope", ["shared", "personal"]);
// Sprint 5 §3a: type = document KIND; pdf/link/image are legacy format
// values kept for historical rows (display as "Other").
export const documentTypeEnum = pgEnum("document_type", ["pdf", "link", "image", "flight", "hotel", "transport", "visa", "other"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "vote_opened",
  "vote_resolved",
  "expense_logged",
  "member_joined",
  "comment_added",
]);
export const chatMessageTypeEnum = pgEnum("chat_message_type", [
  "text",
  "link_card",
  "expense_card",
  "vote_card",
  "itinerary_card",
  "decision_card",
]);

// ─── Profiles (extends Supabase auth.users) ───────────────────────────────────

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  email: text("email"),
  // B13c: per-channel notification opt-outs. Defaults are all-on so a
  // brand-new account hears about everything until they tune it down.
  notifInapp: boolean("notif_inapp").default(true).notNull(),
  notifEmail: boolean("notif_email").default(true).notNull(),
  notifPush: boolean("notif_push").default(true).notNull(),
  notifDigest: boolean("notif_digest").default(true).notNull(),
  // B15-e: viewer's preferred language tag. Cookie remains the source
  // of truth in-session; this column lets server-only flows (email
  // templates, push payloads, digest cron) render in the right tongue
  // without re-reading the browser cookie. Synced by setLocale().
  locale: text("locale").default("en").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Trips ────────────────────────────────────────────────────────────────────

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  destination: text("destination").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  budgetTotal: real("budget_total"),
  /** QA BUG-11: 'flat' = the number IS the trip budget; 'per_person' = multiply by crew size. */
  budgetType: text("budget_type").notNull().default("flat"),
  currency: text("currency").default("USD").notNull(),
  coverImage: text("cover_image"),
  // B19: Unsplash hero image cached at trip-view time. credit fields
  // store the photographer attribution required by Unsplash API rules.
  heroImageUrl: text("hero_image_url"),
  heroImageCreditName: text("hero_image_credit_name"),
  heroImageCreditLink: text("hero_image_credit_link"),
  shareToken: text("share_token").unique(), // non-null = public share enabled
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Trip Members ─────────────────────────────────────────────────────────────

export const tripMembers = pgTable("trip_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  displayName: text("display_name").notNull(), // cached for guests
  role: tripMemberRoleEnum("role").default("member").notNull(),
  balanceNet: real("balance_net").default(0).notNull(), // positive = owed money, negative = owes money
  // Each member's personal pocket-money cap for this trip (B2 Budget v2).
  // NULL = they haven't set one; we still track spend but skip the
  // "over budget" coloring on the budget-health card.
  personalBudget: real("personal_budget"),
  // Bumped each time the user views the chat at the bottom — drives the
  // ✓✓ read-receipt indicator on outgoing messages and unread badges.
  lastReadChatAt: timestamp("last_read_chat_at", { withTimezone: true }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// ─── Trip Invite Tokens ───────────────────────────────────────────────────────

export const tripInvites = pgTable("trip_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  /** QA BUG-2: wizard "Who is coming?" emails persist as targeted invites. */
  invitedEmail: text("invited_email"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  expiresAt: timestamp("expires_at"), // null = never expires
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Itinerary Items ──────────────────────────────────────────────────────────

export const itineraryItems = pgTable("itinerary_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  dayDate: date("day_date").notNull(),
  title: text("title").notNull(),
  type: itineraryItemTypeEnum("type").default("activity").notNull(),
  startTime: time("start_time"),
  locationName: text("location_name"),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
  costEstimate: real("cost_estimate"),
  bookingUrl: text("booking_url"),
  notes: text("notes"),
  // B5: Foursquare metadata — populated when the item was added via the
  // place-search flow. NULL for manually-entered items.
  fsqId: text("fsq_id"),
  fsqCategory: text("fsq_category"),
  photoUrl: text("photo_url"),
  rating: real("rating"),
  priceLevel: integer("price_level"),
  hoursSummary: text("hours_summary"),
  topTip: text("top_tip"),
  // v2 Discovery (additive): a discovered Google place carries its durable id +
  // richer metadata so the item lands on the map with full data. provider
  // disambiguates google vs the legacy fsq vs a manual entry.
  googlePlaceId: text("google_place_id"),
  provider: text("provider").default("manual"),
  userRatingsTotal: integer("user_ratings_total"),
  placeTypes: jsonb("place_types"),
  address: text("address"),
  status: itineraryItemStatusEnum("status").default("proposed").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  // Phase 6 §6: booking anchors — flights/hotels are pinned, undeletable,
  // unvotable stops. Regular stops keep 'regular'.
  stopType: text("stop_type").default("regular").notNull(),
  // Phase 6 §3-C: LIVE-phase "Done ✓" check-off; also feeds Wrap stats.
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Votes ────────────────────────────────────────────────────────────────────

export const votes = pgTable("votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  deadline: timestamp("deadline"),
  status: voteStatusEnum("status").default("open").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const voteOptions = pgTable("vote_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  voteId: uuid("vote_id")
    .notNull()
    .references(() => votes.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  itineraryItemId: uuid("itinerary_item_id").references(() => itineraryItems.id),
  costEstimate: real("cost_estimate"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const voteResponses = pgTable("vote_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  voteId: uuid("vote_id")
    .notNull()
    .references(() => votes.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  selectedOptionId: uuid("selected_option_id")
    .notNull()
    .references(() => voteOptions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  itineraryItemId: uuid("itinerary_item_id").references(() => itineraryItems.id),
  title: text("title").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").default("USD").notNull(),
  paidBy: uuid("paid_by")
    .notNull()
    .references(() => profiles.id),
  category: expenseCategoryEnum("category").default("other").notNull(),
  // B2 Budget v2: shared expenses get split across members and count
  // toward trip cap; personal expenses are pocket-money — no splits,
  // counts only toward the payer's personal budget.
  scope: expenseScopeEnum("scope").default("shared").notNull(),
  expenseDate: date("expense_date").notNull(),
  notes: text("notes"),
  // B12: optional receipt image stored in Supabase Storage under the
  // trip-documents bucket. Splitwise-style attachment — null = no
  // receipt. Shown as a thumbnail on the expense detail sheet.
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenseSplits = pgTable("expense_splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  amountOwed: real("amount_owed").notNull(),
  settled: boolean("settled").default(false).notNull(),
  settledAt: timestamp("settled_at"),
});

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  type: documentTypeEnum("type").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  dayDate: date("day_date"),
  // B6: free-text caption shown alongside the title in the Pack tab.
  description: text("description"),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sprint 8 Item 6 (RECAP sheet): crew photos attached to stops for the Wrap.
export const tripPhotos = pgTable("trip_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").references(() => itineraryItems.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Comments ─────────────────────────────────────────────────────────────────

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // 'itinerary_item' | 'vote' | 'expense'
  entityId: uuid("entity_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  // B13b: tripId is required for the in-app inbox click destination —
  // every kind we record is trip-scoped. The DB column is still
  // nullable for back-compat with the earlier shape, but new inserts
  // always include it.
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  // B13b: switched from notificationTypeEnum to plain text in the DB
  // (migration b13b_notifications_type_to_text) so new kinds —
  // split_settled, vote_closed, trip_starting_soon — don't need an
  // enum migration each time.
  type: text("type").notNull(),
  title: text("title"),
  body: text("body"),
  // B13b: actor + payload added so the renderer can build copy
  // without re-querying. payload is jsonb for forward compat.
  actorUserId: uuid("actor_user_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  payload: jsonb("payload"),
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  type: chatMessageTypeEnum("type").default("text").notNull(),
  body: text("body"), // text content (null for pure card messages)
  metadata: jsonb("metadata"), // card-specific structured data
  replyToId: uuid("reply_to_id"), // for threaded replies
  pinned: boolean("pinned").default(false).notNull(),
  deletedAt: timestamp("deleted_at"), // soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageReactions = pgTable("message_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => chatMessages.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Waitlist signups ────────────────────────────────────────────────────────
//
// Landing-page email capture for visitors who aren't ready to sign up
// properly. Kept separate from `profiles` so a waitlist signup never
// implies an actual Supabase auth user exists. Unique by email so the
// form doesn't double-add on repeat submits.
export const waitlistSignups = pgTable("waitlist_signups", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  source: text("source"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Push subscriptions ──────────────────────────────────────────────────────
//
// One row per device subscribed to web push (phone + laptop + tablet ok).
// `endpoint` is the Web Push service URL (FCM / APNs gateway / Mozilla) and
// p256dh+auth are the encryption keys for payload delivery. Last_seen_at is
// bumped on every successful push so we can prune dead endpoints.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Packing list ────────────────────────────────────────────────────────────
//
// `user_id` NULL means a shared/group item (tent, first-aid kit); a uuid
// means it belongs to that traveler's personal checklist. `created_by` tracks
// who added it (for delete authorization).
export const packingItems = pgTable("packing_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
  label: text("label").notNull(),
  category: text("category").default("general").notNull(),
  packed: boolean("packed").default(false).notNull(),
  notes: text("notes"),
  // Phase 6 §12 M008: shared-gear assignment ("who brings the first-aid kit").
  assigneeId: uuid("assignee_id").references(() => profiles.id),
  isShared: boolean("is_shared").default(false),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const tripsRelations = relations(trips, ({ one, many }) => ({
  creator: one(profiles, { fields: [trips.createdBy], references: [profiles.id] }),
  members: many(tripMembers),
  invites: many(tripInvites),
  itineraryItems: many(itineraryItems),
  votes: many(votes),
  expenses: many(expenses),
  documents: many(documents),
  comments: many(comments),
  chatMessages: many(chatMessages),
}));

export const tripMembersRelations = relations(tripMembers, ({ one }) => ({
  trip: one(trips, { fields: [tripMembers.tripId], references: [trips.id] }),
  user: one(profiles, { fields: [tripMembers.userId], references: [profiles.id] }),
}));

export const itineraryItemsRelations = relations(itineraryItems, ({ one, many }) => ({
  trip: one(trips, { fields: [itineraryItems.tripId], references: [trips.id] }),
  creator: one(profiles, { fields: [itineraryItems.createdBy], references: [profiles.id] }),
  comments: many(comments),
}));

export const votesRelations = relations(votes, ({ one, many }) => ({
  trip: one(trips, { fields: [votes.tripId], references: [trips.id] }),
  creator: one(profiles, { fields: [votes.createdBy], references: [profiles.id] }),
  options: many(voteOptions),
  responses: many(voteResponses),
}));

export const voteOptionsRelations = relations(voteOptions, ({ one }) => ({
  vote: one(votes, { fields: [voteOptions.voteId], references: [votes.id] }),
}));

export const voteResponsesRelations = relations(voteResponses, ({ one }) => ({
  vote: one(votes, { fields: [voteResponses.voteId], references: [votes.id] }),
  user: one(profiles, { fields: [voteResponses.userId], references: [profiles.id] }),
  selectedOption: one(voteOptions, {
    fields: [voteResponses.selectedOptionId],
    references: [voteOptions.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  trip: one(trips, { fields: [expenses.tripId], references: [trips.id] }),
  payer: one(profiles, { fields: [expenses.paidBy], references: [profiles.id] }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
  user: one(profiles, { fields: [expenseSplits.userId], references: [profiles.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  trip: one(trips, { fields: [documents.tripId], references: [trips.id] }),
  uploader: one(profiles, { fields: [documents.uploadedBy], references: [profiles.id] }),
}));

export const tripInvitesRelations = relations(tripInvites, ({ one }) => ({
  trip: one(trips, { fields: [tripInvites.tripId], references: [trips.id] }),
  creator: one(profiles, { fields: [tripInvites.createdBy], references: [profiles.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  trip: one(trips, { fields: [chatMessages.tripId], references: [trips.id] }),
  author: one(profiles, { fields: [chatMessages.userId], references: [profiles.id] }),
  replyTo: one(chatMessages, {
    fields: [chatMessages.replyToId],
    references: [chatMessages.id],
    relationName: "replies",
  }),
  replies: many(chatMessages, { relationName: "replies" }),
  reactions: many(messageReactions),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(chatMessages, {
    fields: [messageReactions.messageId],
    references: [chatMessages.id],
  }),
  user: one(profiles, { fields: [messageReactions.userId], references: [profiles.id] }),
}));

// ─── v2 Discovery (Phase A) ────────────────────────────────────────────────────
// All additive: new tables + nullable cols. Nothing in the current app reads
// these, so applying the migration is non-destructive for live testers.
// Specs: docs/v2-discovery-{planning,logic,build-spec}.md

/**
 * Shared cross-user cache of resolved Google places. Everyone planning the same
 * city hits the same restaurants → cache once, serve many. The single biggest
 * lever on Google Places spend. `snapshot` holds the normalized Place object;
 * `fetched_at` drives the ~30-day TTL + stale-while-revalidate refresh.
 */
export const cachedPlaces = pgTable("cached_places", {
  placeId: text("place_id").primaryKey(),
  snapshot: jsonb("snapshot").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

/**
 * Global Google Places spend ledger — the kill-switch's source of truth.
 * One row per (UTC day, SKU); `id` = "YYYY-MM-DD:sku" so an atomic upsert can
 * increment it. The in-memory meter is a per-instance fast floor; this table
 * makes the daily cap aggregate across all serverless instances (the hardening
 * named in docs/v2-discovery-planning.md §5.4 and the meter's own TODO).
 */
export const placesSpend = pgTable("places_spend", {
  id: text("id").primaryKey(), // `${day}:${sku}`
  day: text("day").notNull(), // UTC YYYY-MM-DD
  sku: text("sku").notNull(),
  count: integer("count").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * The in-session signal log — the raw events that feed the taste engine
 * (build-spec Part A). One row per micro-interaction (dwell, open, add, vote,
 * expense…). `features` denormalizes the place's feature vector at event time
 * so the engine updates the taste vector without re-fetching the place.
 */
export const placeEvents = pgTable("place_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  placeId: text("place_id"),
  /** Event kind: card_dwell · card_open · place_add · decision_vote · expense_at_place … */
  type: text("type").notNull(),
  /** Event-specific payload (dwell_ms, vote, day, amount…). */
  payload: jsonb("payload"),
  /** Place feature vector at event time (for the engine update). */
  features: jsonb("features"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Persisted taste vectors. One row per (trip, user) for the personal/durable
 * vector; user_id NULL = the crew-aggregate vector for the trip. The fast
 * session vector lives in memory/edge during a session; what persists here is
 * the slow durable vector (build-spec §2.1).
 */
export const tasteProfiles = pgTable("taste_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  /** NULL = crew-aggregate vector for the trip. */
  userId: uuid("user_id").references(() => profiles.id),
  /** Sparse durable preference vector { tag: weight } + scalar axes. */
  vector: jsonb("vector"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Crew decisions (the chat-embedded vote that replaces the Votes page).
 * A discovered place a member/owner proposed; votes accrue inline on the chat
 * card. Pass → auto-commit to a day; fail → stays as a record. (logic §6.)
 */
export const decisions = pgTable("decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  placeId: text("place_id"),
  /** Denormalized place snapshot so the card renders without a Google call. */
  snapshot: jsonb("snapshot"),
  proposedBy: uuid("proposed_by")
    .notNull()
    .references(() => profiles.id),
  proposedDay: date("proposed_day"),
  /** The chat message this decision card is attached to. */
  chatMessageId: uuid("chat_message_id").references(() => chatMessages.id, {
    onDelete: "set null",
  }),
  /** open · passed · failed · no_quorum · cancelled */
  status: text("status").default("open").notNull(),
  /** Per-member votes: { userId: "yes" | "no" }. */
  votes: jsonb("votes"),
  closesAt: timestamp("closes_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

/**
 * §3-A: per-user saved places (the Discover "heart" wishlist), scoped to a
 * trip. Denormalizes enough of the place (name, photo ref, category, rating,
 * coords) to render the wishlist cards and to add the place to a day without a
 * Google call. UNIQUE(trip_id, user_id, place_id) enforced in the migration.
 */
export const tripWishlist = pgTable("trip_wishlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  placeId: text("place_id").notNull(),
  placeName: text("place_name").notNull(),
  photoRef: text("photo_ref"),
  category: text("category"),
  rating: real("rating"),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// §1-E (Phase 5): a like/heart on a discover place, scoped per trip so counts
// reflect the crew. One row per (place, trip, user).
export const placeLikes = pgTable("place_likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  placeId: text("place_id").notNull(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══ Phase 6 (paxawa_phase6_brief.md §12) ═════════════════════════════════════

/** §6: booking details attached to a booking-anchor itinerary item. */
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  stopId: uuid("stop_id").references(() => itineraryItems.id, { onDelete: "cascade" }),
  bookingType: text("booking_type").notNull(), // 'flight' | 'stay' | 'other'
  providerName: text("provider_name"),
  confirmationNumber: text("confirmation_number"),
  checkinTime: timestamp("checkin_time", { withTimezone: true }),
  checkoutTime: timestamp("checkout_time", { withTimezone: true }),
  nights: integer("nights"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references(() => profiles.id),
});

/** §4-A: Huddle decision deck cards (suggestion / poll / budget / pack / rally). */
export const huddleDecisions = pgTable("huddle_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // suggestion | poll | budget_approval | pack_assignment | rally
  status: text("status").default("open").notNull(), // open | resolved | expired
  placeId: text("place_id"),
  placeName: text("place_name"),
  placePhotoUrl: text("place_photo_url"),
  placeRating: numeric("place_rating", { precision: 3, scale: 1 }),
  placeCategory: text("place_category"),
  placeNeighborhood: text("place_neighborhood"),
  createdBy: uuid("created_by").references(() => profiles.id),
  suggestedDay: date("suggested_day"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  outcome: text("outcome"),
  pollQuestion: text("poll_question"),
  pollOptions: jsonb("poll_options"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const decisionReactions = pgTable(
  "decision_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    decisionId: uuid("decision_id").references(() => huddleDecisions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id),
    reaction: text("reaction").notNull(), // add_it | love | discuss | approve | claim
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.decisionId, t.userId, t.reaction)],
);

/** §4-B: Pulse activity log — every crew action writes a row; realtime-enabled. */
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => profiles.id),
    eventType: text("event_type").notNull(),
    placeId: text("place_id"),
    placeName: text("place_name"),
    placePhotoUrl: text("place_photo_url"),
    stopId: uuid("stop_id").references(() => itineraryItems.id, { onDelete: "set null" }),
    expenseId: uuid("expense_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    amountBase: numeric("amount_base", { precision: 12, scale: 2 }),
    currency: char("currency", { length: 3 }),
    metadata: jsonb("metadata"),
    isSystem: boolean("is_system").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("activities_trip_created").on(t.tripId, t.createdAt)],
);

/** §4-C: contextual threads anchored to a place/stop/expense/day/poll. */
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // place | stop | expense | day | poll
    entityId: text("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.tripId, t.entityType, t.entityId)],
);

export const threadComments = pgTable(
  "thread_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").references(() => threads.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id),
    content: text("content").notNull(),
    tapbacks: jsonb("tapbacks").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("thread_comments_thread").on(t.threadId, t.createdAt)],
);

/** §5: taste engine — 0–100 on the five sanctioned dimensions. */
export const placeTasteTags = pgTable("place_taste_tags", {
  placeId: text("place_id").primaryKey(),
  budget: integer("budget").default(50).notNull(),
  discovery: integer("discovery").default(50).notNull(),
  energy: integer("energy").default(50).notNull(),
  vibe: integer("vibe").default(50).notNull(),
  depth: integer("depth").default(50).notNull(),
  taggedAt: timestamp("tagged_at", { withTimezone: true }).defaultNow(),
});

export const userTasteVectors = pgTable("user_taste_vectors", {
  userId: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  budget: numeric("budget", { precision: 5, scale: 2 }).default("50"),
  discovery: numeric("discovery", { precision: 5, scale: 2 }).default("50"),
  energy: numeric("energy", { precision: 5, scale: 2 }).default("50"),
  vibe: numeric("vibe", { precision: 5, scale: 2 }).default("50"),
  depth: numeric("depth", { precision: 5, scale: 2 }).default("50"),
  interactionCount: integer("interaction_count").default(0),
  onboarded: boolean("onboarded").default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const placeInteractions = pgTable(
  "place_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    placeId: text("place_id").notNull(),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }),
    signal: text("signal").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("place_interactions_user").on(t.userId, t.createdAt)],
);

/** §8-A: settled debt pairs. */
export const settlements = pgTable("settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
  creditorId: uuid("creditor_id").references(() => profiles.id),
  debtorId: uuid("debtor_id").references(() => profiles.id),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  currency: char("currency", { length: 3 }),
  settledAt: timestamp("settled_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references(() => profiles.id),
});

// Phase 6 relations
export const bookingsRelations = relations(bookings, ({ one }) => ({
  stop: one(itineraryItems, { fields: [bookings.stopId], references: [itineraryItems.id] }),
}));

export const huddleDecisionsRelations = relations(huddleDecisions, ({ one, many }) => ({
  author: one(profiles, { fields: [huddleDecisions.createdBy], references: [profiles.id] }),
  reactions: many(decisionReactions),
}));

export const decisionReactionsRelations = relations(decisionReactions, ({ one }) => ({
  decision: one(huddleDecisions, { fields: [decisionReactions.decisionId], references: [huddleDecisions.id] }),
  user: one(profiles, { fields: [decisionReactions.userId], references: [profiles.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  actor: one(profiles, { fields: [activities.actorId], references: [profiles.id] }),
}));

export const threadsRelations = relations(threads, ({ many }) => ({
  comments: many(threadComments),
}));

export const threadCommentsRelations = relations(threadComments, ({ one }) => ({
  thread: one(threads, { fields: [threadComments.threadId], references: [threads.id] }),
  user: one(profiles, { fields: [threadComments.userId], references: [profiles.id] }),
}));
