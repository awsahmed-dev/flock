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
export const documentTypeEnum = pgEnum("document_type", ["pdf", "link", "image"]);
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
  email: text("email"),
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
  currency: text("currency").default("USD").notNull(),
  coverImage: text("cover_image"),
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
  status: itineraryItemStatusEnum("status").default("proposed").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
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
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  read: boolean("read").default(false).notNull(),
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
