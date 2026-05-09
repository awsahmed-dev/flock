import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { expenses, chatMessages } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Budget watcher — called from createExpense (and applyDetectedAction's
 * expense path) after an insert. If the trip's total spend just crossed
 * 75 / 90 / 100% of the budget, post a friendly Haiku-generated nudge
 * to the chat.
 *
 * Notes:
 * - The chat_message_type pgEnum doesn't include "budget_alert", so we
 *   write rows as plain "text" and tag them via metadata.kind for
 *   idempotency. The 🤖 prefix is what surfaces them visually.
 * - Idempotent: each threshold fires at most once per trip.
 * - Soft-fails on every error path — never throws into the calling flow.
 */

const THRESHOLDS = [0.75, 0.9, 1.0] as const;
type Threshold = (typeof THRESHOLDS)[number];

const FALLBACK_NUDGES: Record<Threshold, (pct: number, currency: string, remaining: number) => string> = {
  0.75: (_p, c, r) =>
    `Heads up — you've used 75% of the trip budget. About ${c} ${r.toLocaleString()} left.`,
  0.9: (_p, c, r) =>
    `You're at 90% of the budget — only ${c} ${r.toLocaleString()} remaining. Time to be picky.`,
  1.0: (p) =>
    `Trip is now over budget by ${Math.round((p - 1) * 100)}%. Worth a quick chat?`,
};

export async function maybePostBudgetAlert(
  tripId: string,
  budgetTotal: number | null | undefined,
  currency: string,
  authorUserId: string,
): Promise<void> {
  try {
    if (!budgetTotal || budgetTotal <= 0) return;

    // Sum spend for this trip
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)::float` })
      .from(expenses)
      .where(eq(expenses.tripId, tripId));

    const spent = Number(row?.total ?? 0);
    if (!Number.isFinite(spent) || spent <= 0) return;

    const pct = spent / budgetTotal;
    const crossed = [...THRESHOLDS].reverse().find((t) => pct >= t) as Threshold | undefined;
    if (crossed === undefined) return;

    // Idempotency check: have we posted this threshold for this trip already?
    const prior = await db.query.chatMessages.findMany({
      where: and(
        eq(chatMessages.tripId, tripId),
        sql`${chatMessages.metadata}->>'kind' = 'budget_alert'`,
      ),
      columns: { id: true, metadata: true },
    });
    if (prior.some((m) => (m.metadata as any)?.threshold === crossed)) return;

    const remaining = Math.max(0, budgetTotal - spent);
    let body = FALLBACK_NUDGES[crossed](pct, currency, remaining);

    // Best-effort: ask Haiku for a friendlier phrasing.
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const client = new Anthropic({ apiKey });
        const res = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 80,
          messages: [
            {
              role: "user",
              content: `Trip group budget update. Spent ${currency} ${spent.toLocaleString()} of ${currency} ${budgetTotal.toLocaleString()} (${Math.round(pct * 100)}%). Write ONE friendly chat message (under 25 words) nudging the group about the budget status. Casual tone, no exclamation marks. No greeting. Plain text, no fences.`,
            },
          ],
        });
        const text = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
        if (text && text.length > 0 && text.length < 240) body = text;
      } catch {
        // keep fallback
      }
    }

    await db
      .insert(chatMessages)
      .values({
        tripId,
        userId: authorUserId,
        body: `🤖 ${body}`,
        type: "text",
        metadata: {
          kind: "budget_alert",
          threshold: crossed,
          spent,
          budgetTotal,
          currency,
          generatedAt: new Date().toISOString(),
        },
      })
      .catch(() => {});
  } catch (err) {
    console.error("[budget-watcher] failed:", err);
  }
}
