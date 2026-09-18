/**
 * Turning a thrown server error into something an Arabic reader can read.
 *
 * Every planning action reports refusals by throwing, and every screen
 * catches with `toast.error(err.message)`. That message is written in
 * English in the action — "No nights free — shorten a stay first" — so
 * the whole refusal vocabulary of the planner, thirty-odd sentences,
 * arrived untranslated in an Arabic UI. The translated fallback each
 * screen already had could never fire, because a thrown Error always has
 * a message.
 *
 * So the actions throw KEYS now ("err.noNightsFree") and this resolves
 * them. Anything that is not a key — a database driver's message, a
 * network failure, something thrown by a library — is not shown raw:
 * those are not written for users in any language.
 */
export function errorText(
  t: (k: string, p?: Record<string, string | number>) => string,
  err: unknown,
  /** what to say when the error is not one of ours */
  fallbackKey = "shape.failed",
): string {
  // Accepts three shapes, because a refusal now travels as returned data
  // ("err.noNightsFree"), while a genuine fault still arrives as an Error.
  const raw =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : typeof (err as { error?: unknown })?.error === "string"
          ? ((err as { error: string }).error)
          : "";
  if (raw.startsWith("err.")) {
    const said = t(raw);
    // `t` hands back the key when it has no entry for it; showing
    // "err.noNightsFree" to a user is worse than the generic sentence.
    if (said !== raw) return said;
  }
  return t(fallbackKey);
}
