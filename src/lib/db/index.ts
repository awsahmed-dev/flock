import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.startsWith("your_")) {
    // Return a proxy that throws a helpful error at query time, not at import time
    return drizzle(postgres("postgresql://placeholder/placeholder", { prepare: false }), { schema });
  }
  // Disable prefetch for transaction mode (Supabase pooler)
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export const db = createDb();
