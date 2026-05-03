// ─── OneSignal push notification sender ──────────────────────────────────────
// Used from server actions to push real-time notifications to group members.

import { getBaseUrl } from "./base-url";

const ONESIGNAL_API = "https://onesignal.com/api/v1/notifications";

interface SendOptions {
  /** OneSignal external user IDs (= our Supabase user IDs) to target */
  userIds: string[];
  title: string;
  body: string;
  /** Deep-link URL inside the app */
  url?: string;
  /** Optional icon override */
  icon?: string;
}

export async function sendPushNotification(opts: SendOptions): Promise<void> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) return; // not configured — silently skip
  if (opts.userIds.length === 0) return;

  const payload = {
    app_id: appId,
    include_aliases: {
      external_id: opts.userIds,
    },
    target_channel: "push",
    headings: { en: opts.title },
    contents: { en: opts.body },
    url: opts.url,
    chrome_web_icon: opts.icon ?? "/icons/icon-192x192.png",
    firefox_icon: opts.icon ?? "/icons/icon-192x192.png",
    small_icon: "ic_stat_onesignal_default",
  };

  try {
    await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Notifications are best-effort — never throw
  }
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export async function notifyNewVote(
  memberIds: string[],
  excludeUserId: string,
  question: string,
  tripId: string,
  tripName: string
) {
  await sendPushNotification({
    userIds: memberIds.filter((id) => id !== excludeUserId),
    title: `🗳️ New vote in ${tripName}`,
    body: question,
    url: `${getBaseUrl()}/trips/${tripId}/votes`,
  });
}

export async function notifyNewExpense(
  memberIds: string[],
  excludeUserId: string,
  description: string,
  amount: number,
  currency: string,
  tripId: string,
  tripName: string
) {
  await sendPushNotification({
    userIds: memberIds.filter((id) => id !== excludeUserId),
    title: `💸 New expense in ${tripName}`,
    body: `${description} — ${currency} ${amount}`,
    url: `${getBaseUrl()}/trips/${tripId}/expenses`,
  });
}

export async function notifyMemberJoined(
  memberIds: string[],
  newMemberName: string,
  tripId: string,
  tripName: string
) {
  await sendPushNotification({
    userIds: memberIds,
    title: `👋 ${newMemberName} joined ${tripName}`,
    body: "Your crew is growing — check who's in.",
    url: `${getBaseUrl()}/trips/${tripId}/members`,
  });
}

export async function notifyNewChatMessage(
  memberIds: string[],
  excludeUserId: string,
  senderName: string,
  preview: string,
  tripId: string,
  tripName: string
) {
  await sendPushNotification({
    userIds: memberIds.filter((id) => id !== excludeUserId),
    title: `💬 ${senderName} in ${tripName}`,
    body: preview.length > 80 ? preview.slice(0, 80) + "…" : preview,
    url: `${getBaseUrl()}/trips/${tripId}`,
  });
}
