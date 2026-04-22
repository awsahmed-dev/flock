import postgres from "postgres";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function run() {
  console.log("Creating chat_message_type enum...");
  await sql`
    DO $$ BEGIN
      CREATE TYPE chat_message_type AS ENUM (
        'text', 'link_card', 'expense_card', 'vote_card', 'itinerary_card', 'decision_card'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `;

  console.log("Creating chat_messages table...");
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      user_id     UUID NOT NULL REFERENCES profiles(id),
      type        chat_message_type NOT NULL DEFAULT 'text',
      body        TEXT,
      metadata    JSONB,
      reply_to_id UUID REFERENCES chat_messages(id),
      pinned      BOOLEAN NOT NULL DEFAULT false,
      deleted_at  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  console.log("Creating message_reactions table...");
  await sql`
    CREATE TABLE IF NOT EXISTS message_reactions (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
      user_id    UUID NOT NULL REFERENCES profiles(id),
      emoji      TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, user_id, emoji)
    );
  `;

  console.log("Creating indexes...");
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_trip_id ON chat_messages(trip_id, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id)`;

  console.log("✅ Chat tables created successfully");
  await sql.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
