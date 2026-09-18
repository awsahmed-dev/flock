/**
 * A refusal the user is meant to read.
 *
 * Planning actions say no for ordinary reasons — no nights free, that
 * city already ends the trip, this stay is booked. Those were thrown,
 * and a thrown message does not survive a server action in production:
 * React replaces it with "An error occurred in the Server Components
 * render. The specific message is omitted…" before the browser sees it.
 * So the sentence written for the user never arrived, in any language.
 *
 * A RETURNED value is ordinary serialised data and is never redacted.
 * Expected refusals come back as one of these; genuine faults — not
 * signed in, not the owner, a malformed payload — still throw, because
 * those are not a conversation with the user.
 *
 * This lives in its own module because an action file is "use server",
 * and such a file may only export async functions — a type and a type
 * guard cannot live beside the actions that produce them.
 */
export type Refused = { ok: false; error: string };

export function refused(r: unknown): r is Refused {
  return !!r && typeof r === "object" && (r as Refused).ok === false;
}
