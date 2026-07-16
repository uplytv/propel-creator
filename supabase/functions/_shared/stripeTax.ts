// Flag-gated Stripe Tax for Checkout Sessions.
//
// REALITY CHECK: `automatic_tax` only works after the account OWNER enables
// Stripe Tax in the dashboard (activate Tax, set origin address, add at least
// one registration). If Tax is NOT enabled, session creation with
// `automatic_tax` FAILS. So this is gated behind the ENABLE_STRIPE_TAX
// edge-function secret and defaults to OFF — when off, sessions are created
// with byte-identical params to the pre-tax behavior.
//
// FEE MATH IS NEVER TOUCHED HERE. The 95/5 split (application_fee_amount /
// application_fee_percent) is computed by callers from the PRE-TAX amount;
// Stripe adds tax on top for the buyer, and the platform's application fee
// continues to apply to the pre-tax amount only.
//
// FAIL-SAFE: if the flag is on but Stripe rejects the session for a
// tax-configuration reason, we retry ONCE without automatic_tax and log a
// structured warning — a misconfigured tax setup must never lose a sale.
//
// Owner setup checklist: STRIPE-TAX-SETUP.md at the repo root.

// deno-lint-ignore no-explicit-any
type StripeLike = any;

/** True when the owner has flipped the ENABLE_STRIPE_TAX secret to "true". */
export const stripeTaxEnabled = (): boolean =>
  Deno.env.get("ENABLE_STRIPE_TAX") === "true";

/**
 * Heuristic for "this failure is about tax configuration, not the sale".
 * Covers Stripe's errors for Tax not activated, missing origin address /
 * head office, missing registrations, and prices without a tax_behavior.
 */
const isTaxConfigError = (err: unknown): boolean => {
  const e = err as { param?: string; message?: string; code?: string } | null;
  if (!e) return false;
  if (typeof e.param === "string" && e.param.includes("automatic_tax")) return true;
  const msg = `${e.message ?? ""} ${e.code ?? ""}`.toLowerCase();
  return (
    msg.includes("automatic_tax") ||
    msg.includes("automatic tax") ||
    msg.includes("stripe tax") ||
    msg.includes("tax_behavior") ||
    msg.includes("tax behavior") ||
    msg.includes("origin address") ||
    msg.includes("head office") ||
    msg.includes("tax registration") ||
    msg.includes("tax calculation")
  );
};

/**
 * Create a Checkout Session, adding `automatic_tax: { enabled: true }` when
 * ENABLE_STRIPE_TAX === "true".
 *
 * - Flag OFF (default): behaves exactly like
 *   `stripe.checkout.sessions.create(sessionConfig, requestOptions)`.
 * - Flag ON: adds automatic_tax. If Stripe rejects the session with a
 *   tax-configuration error, retries once WITHOUT automatic_tax (structured
 *   warning logged). Non-tax errors are rethrown untouched so callers'
 *   existing error handling (coupon release, order cleanup) still runs.
 */
export async function createSessionWithTax(
  stripe: StripeLike,
  sessionConfig: Record<string, unknown>,
  requestOptions?: { idempotencyKey?: string },
  logContext?: string,
): Promise<StripeLike> {
  if (!stripeTaxEnabled()) {
    return await stripe.checkout.sessions.create(sessionConfig, requestOptions);
  }

  const taxedConfig = { ...sessionConfig, automatic_tax: { enabled: true } };
  try {
    return await stripe.checkout.sessions.create(taxedConfig, requestOptions);
  } catch (e) {
    if (!isTaxConfigError(e)) throw e;
    console.warn(JSON.stringify({
      level: "warn",
      event: "stripe_tax_fallback",
      fn: logContext ?? "unknown",
      message:
        "automatic_tax session creation failed; retried once without tax. " +
        "Check Stripe Tax dashboard setup or unset ENABLE_STRIPE_TAX.",
      stripe_error: (e as Error)?.message ?? String(e),
    }));
    // The retry has different params (no automatic_tax), so it must NOT
    // reuse the original idempotency key — Stripe rejects a reused key
    // whose params differ. Derive a stable sibling key instead.
    const retryOptions = requestOptions?.idempotencyKey
      ? { ...requestOptions, idempotencyKey: `${requestOptions.idempotencyKey}-notax` }
      : requestOptions;
    return await stripe.checkout.sessions.create(sessionConfig, retryOptions);
  }
}
