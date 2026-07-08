// ═══════════════════════════════════════════════════════════════════════════
// stripeWebhookLogic.ts — PURE decision logic for the Stripe webhook.
//
// HARD CONSTRAINTS:
//   * Zero imports (no Deno, no URL imports, no npm). Plain TypeScript only,
//     so BOTH the Deno edge function (supabase/functions/stripe-webhook) and
//     vitest (src/test/stripe-webhook-logic.test.ts) can import it.
//   * No I/O — these functions decide; the webhook executes.
//   * 95/5 payout math is untouched: clawbacks reverse the PREVIOUSLY-CREDITED
//     net amount (already computed at 95%), never recompute the split.
// ═══════════════════════════════════════════════════════════════════════════

/** round to cents, avoiding float drift (95 * 0.4 = 38.000000000000004 etc.) */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ── Purchase-type routing (extraction of the checkout.session.completed switch) ──

export type PurchaseBranch =
  | "track"
  | "tip"
  | "product_course"
  | "event_ticket"
  | "credits"
  | "subscription"
  | "live_product"
  | "legacy_fallback";

/**
 * Behavior-preserving extraction of the branch selection in the
 * checkout.session.completed handler. Missing/empty purchase_type defaults to
 * "subscription" (current behavior); unknown values (e.g. "cart", finalized by
 * finalize-cart-order) fall into the legacy fallback branch, which no-ops
 * without member_id + creator_id.
 */
export function classifyPurchaseType(
  metadata?: { purchase_type?: string | null } | null,
): PurchaseBranch {
  const t = (metadata && metadata.purchase_type) || "subscription";
  switch (t) {
    case "track": return "track";
    case "tip": return "tip";
    case "product":
    case "course": return "product_course";
    case "event_ticket": return "event_ticket";
    case "credits": return "credits";
    case "subscription": return "subscription";
    case "live_product": return "live_product";
    default: return "legacy_fallback";
  }
}

// ── Change 3: fulfillment skip for PPV access purchases ──

export interface FulfillmentInput {
  /** live_products.type for the purchased row ('sell' | 'auction' | 'ppv_access' | ...) */
  liveProductType?: string | null;
  /** checkout session metadata.context (PPV checkouts tag "ppv") */
  metadataContext?: string | null;
}

/**
 * PPV access purchases are digital entitlements — nothing ships, so no
 * fulfillment record should hit the creator's fulfillment queue. Every other
 * live product type (or an unknown type) keeps today's behavior: create one.
 */
export function shouldCreateFulfillment(input: FulfillmentInput): boolean {
  const productType = (input.liveProductType || "").toLowerCase();
  const context = (input.metadataContext || "").toLowerCase();
  if (productType === "ppv_access") return false;
  if (context === "ppv") return false;
  return true;
}

// ── Change 2: refund wallet clawback math ──

export interface RefundClawbackInput {
  /** charge.amount — original charge total, in cents */
  amountCents: number;
  /** charge.amount_refunded — CUMULATIVE refunded amount, in cents */
  amountRefundedCents: number;
  /** net_amount credited to the creator on the original "earn" transaction (dollars, 95% of gross) */
  priorCreditedNet: number;
  /** dollars already clawed back for this payment intent by earlier refund events */
  alreadyClawedBack?: number;
  /** creator wallet available_balance (dollars) */
  walletAvailableBalance: number;
}

export interface RefundClawbackResult {
  /** intended net clawback for THIS event (dollars, >= 0) — ledger amount */
  clawback: number;
  /** portion actually removable from the wallet (floored at zero balance) */
  walletDecrement: number;
  /** clawback - walletDecrement (unrecoverable from wallet; logged) */
  shortfall: number;
  /** wallet available_balance after applying walletDecrement */
  newBalance: number;
}

/**
 * Clawback = the previously-credited net (95% share), proportional to how much
 * of the charge was refunded. amount_refunded is cumulative, so passing the sum
 * of prior clawbacks makes this both idempotent on event redelivery and correct
 * across successive partial refunds (only the delta is taken each time).
 * The wallet is floored at zero: whatever cannot be recovered is reported as
 * shortfall for the caller to log — never a negative balance.
 */
export function computeRefundWalletAdjustment(
  input: RefundClawbackInput,
): RefundClawbackResult {
  const balance = input.walletAvailableBalance ?? 0;
  const noop: RefundClawbackResult = {
    clawback: 0,
    walletDecrement: 0,
    shortfall: 0,
    newBalance: balance,
  };

  const amountCents = input.amountCents || 0;
  const refundedCents = input.amountRefundedCents || 0;
  const priorNet = input.priorCreditedNet || 0;
  if (amountCents <= 0 || refundedCents <= 0 || priorNet <= 0) return noop;

  // Full refund claws back exactly what was credited (no re-derivation of the
  // 95% split — avoids off-by-a-cent vs the original fee rounding).
  const fraction = Math.min(1, refundedCents / amountCents);
  const intendedTotal = fraction >= 1 ? priorNet : round2(priorNet * fraction);

  const clawback = Math.max(0, round2(intendedTotal - (input.alreadyClawedBack || 0)));
  if (clawback <= 0) return noop;

  const walletDecrement = round2(Math.min(clawback, Math.max(0, balance)));
  const shortfall = round2(clawback - walletDecrement);
  return {
    clawback,
    walletDecrement,
    shortfall,
    newBalance: round2(balance - walletDecrement),
  };
}

/**
 * Idempotency key for one refund. Prefers the newest Stripe refund id; when
 * refunds aren't expanded on the event payload, falls back to
 * charge id + cumulative amount_refunded — stable across redeliveries of the
 * same event, distinct across successive partial refunds.
 */
export function extractRefundIdentifier(charge: {
  id?: string | null;
  amount_refunded?: number | null;
  refunds?: { data?: Array<{ id?: string | null }> } | null;
}): string {
  const newest = charge.refunds?.data?.[0]?.id;
  if (newest) return newest;
  return `${charge.id || "unknown_charge"}:${charge.amount_refunded ?? 0}`;
}

// ── BUG 1: live_purchases keyed by checkout SESSION id, not the payment intent ──

export interface LivePurchaseKeyPlan {
  /** value to STORE in live_purchases.stripe_payment_intent_id on completion */
  storeId: string | null;
  /** ordered lookup keys for locating rows by stripe_payment_intent_id */
  lookupOrder: string[];
}

/**
 * Extracts the payment-intent id from checkout session payload shapes:
 * a plain string (unexpanded webhook payload), an expanded object ({ id }),
 * or null (e.g. subscription-mode sessions / unpaid sessions).
 */
export function extractPaymentIntentId(pi: unknown): string | null {
  if (typeof pi === "string" && pi.length > 0) return pi;
  if (pi && typeof pi === "object") {
    const id = (pi as { id?: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

/**
 * BUG 1 FIX. live_purchases rows are created (status 'pending') by
 * stripe-create-live-purchase with the checkout SESSION id in
 * stripe_payment_intent_id — the real payment intent doesn't exist yet at
 * insert time. The webhook's completion path must:
 *   * STORE the real payment intent (storeId) so refund/dispute paths that
 *     look up by PI can find live purchases, and
 *   * LOOK UP with the real PI first, falling back to the legacy session id
 *     (lookupOrder) so both upgraded rows and pre-fix/pending rows resolve.
 * When the session has no PI (should not happen for paid payment-mode
 * sessions), the session id is kept — never null out an existing key.
 */
export function planLivePurchaseKeys(input: {
  sessionId?: string | null;
  paymentIntentId?: unknown;
}): LivePurchaseKeyPlan {
  const sessionId = input.sessionId || null;
  const paymentIntentId = extractPaymentIntentId(input.paymentIntentId);
  const lookupOrder: string[] = [];
  for (const key of [paymentIntentId, sessionId]) {
    if (key && !lookupOrder.includes(key)) lookupOrder.push(key);
  }
  return { storeId: paymentIntentId ?? sessionId, lookupOrder };
}

// ── BUG 2: sold-out ticket path credited the creator + confirmed the buyer ──

export interface SoldOutOutcome {
  /** credit the creator wallet (95/5 via updateWallet) */
  creditWallet: boolean;
  /** send "Ticket Confirmed!" to the buyer + "New Ticket Sale!" to the creator */
  confirmTickets: boolean;
  /** issue a programmatic full refund of the payment intent */
  issueRefund: boolean;
  buyerNotification: "ticket_confirmed" | "sold_out_refunded";
  /** surface an admin-visible alert (notify_admin) */
  notifyAdmin: boolean;
}

/**
 * BUG 2 FIX. When reserve_event_ticket fails (sold out under concurrency),
 * the creator must NOT be credited for zero tickets and the buyer must NOT
 * see "Ticket Confirmed!". Instead: refund the payment intent (once —
 * refundAlreadyIssued reflects the per-PI guard claim), tell the buyer the
 * truth, and alert admins. reserved=true keeps today's happy path exactly.
 */
export function soldOutOutcome(input: {
  reserved: boolean;
  refundAlreadyIssued?: boolean;
}): SoldOutOutcome {
  if (input.reserved) {
    return {
      creditWallet: true,
      confirmTickets: true,
      issueRefund: false,
      buyerNotification: "ticket_confirmed",
      notifyAdmin: false,
    };
  }
  return {
    creditWallet: false,
    confirmTickets: false,
    issueRefund: !input.refundAlreadyIssued,
    buyerNotification: "sold_out_refunded",
    notifyAdmin: true,
  };
}

// ── BUG 3: read-then-write wallet credit loses concurrent updates ──

export interface WalletCreditRpcArgs {
  p_user_id: string;
  p_net: number;
  p_gross: number;
  p_fee: number;
  p_description: string;
  p_payment_intent_id: string | null;
}

/**
 * BUG 3 — the per-payment-intent idempotency guard, replicated EXACTLY from
 * updateWallet: a completed transactions row with the same PI (any wallet)
 * short-circuits; a null PI runs no guard at all. This is the webhook's
 * per-PI guard — finalize-cart-order's guard is intentionally different
 * (scoped per (PI, wallet), one cart PI legitimately credits several
 * creators) and is NOT covered by this contract.
 */
export function walletCreditGuard(input: {
  paymentIntentId: string | null;
  duplicateCompletedTxExists: boolean;
}): "skip" | "credit" {
  if (input.paymentIntentId && input.duplicateCompletedTxExists) return "skip";
  return "credit";
}

/**
 * Argument shape for the credit_wallet_atomic RPC
 * (migration 20260707100000_atomic_wallet_credit.sql).
 * p_net = amount - fee, exactly as updateWallet computes today, rounded to
 * cents to keep float dust out of the ledger — the 95/5 SPLIT ITSELF IS
 * COMPUTED AT THE CALL SITES AND IS UNTOUCHED.
 */
export function buildWalletCreditRpcArgs(input: {
  creatorId: string;
  amount: number;
  fee: number;
  description: string;
  paymentIntentId: string | null;
}): WalletCreditRpcArgs {
  return {
    p_user_id: input.creatorId,
    p_net: round2(input.amount - input.fee),
    p_gross: input.amount,
    p_fee: input.fee,
    p_description: input.description,
    p_payment_intent_id: input.paymentIntentId,
  };
}

/**
 * True when an RPC error means "the function does not exist" — i.e. migration
 * 20260707100000 has not been applied yet. The webhook then falls back to the
 * legacy read-then-write credit so a mid-deploy window never breaks payments.
 *   * 42883    — Postgres undefined_function
 *   * PGRST202 — PostgREST: function not found in the schema cache
 *   * message match — belt-and-braces for proxies that rewrite codes
 */
export function isMissingRpcError(
  err: { code?: string | null; message?: string | null } | null | undefined,
  fnName: string,
): boolean {
  if (!err) return false;
  if (err.code === "42883" || err.code === "PGRST202") return true;
  const msg = (err.message || "").toLowerCase();
  if (!msg.includes(fnName.toLowerCase())) return false;
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache")
  );
}

// ── Change 1: charge.dispute.created planning ──

export interface DisputeInfo {
  disputeId: string;
  paymentIntentId?: string | null;
  /** dispute.amount, in cents */
  amountCents?: number | null;
  reason?: string | null;
}

export interface DisputeMatchRow {
  id: string;
  creator_id?: string | null;
}

export interface DisputeMatches {
  productPurchases?: DisputeMatchRow[] | null;
  tickets?: DisputeMatchRow[] | null;
  livePurchases?: DisputeMatchRow[] | null;
}

export interface DisputePlan {
  /** true when the payment intent matched at least one purchase record */
  identified: boolean;
  /** product_purchases rows safe to mark status='disputed' (status does not gate access) */
  productPurchaseIdsToMarkDisputed: string[];
  /**
   * Matches we surface but DO NOT status-flip: tickets.status='active' gates
   * scanning (record_scan) and live_purchases.status='completed' gates PPV
   * access (has_stream_ppv_access) — flipping either would auto-revoke, and
   * disputes are contested (policy: never auto-revoke on dispute).
   */
  flaggedWithoutStatusChange: Array<{ table: "tickets" | "live_purchases"; id: string }>;
  /** unique creator ids owed an in-app notification */
  creatorIdsToNotify: string[];
  notificationType: "dispute";
  creatorTitle: string;
  creatorMessage: string;
  adminTitle: string;
  adminMessage: string;
  /** POLICY: always false — chargebacks are contested, access stays until resolution */
  revokeAccess: false;
}

/**
 * Plans the response to charge.dispute.created. Pure: the webhook performs the
 * lookups by payment intent and executes the returned plan. An unknown PI is
 * NOT an error — the plan still carries an admin alert and the webhook must
 * ack with 200.
 */
export function planDisputeActions(
  dispute: DisputeInfo,
  matches: DisputeMatches,
): DisputePlan {
  const productPurchases = matches.productPurchases || [];
  const tickets = matches.tickets || [];
  const livePurchases = matches.livePurchases || [];

  const productPurchaseIdsToMarkDisputed = productPurchases.map((r) => r.id);
  const flaggedWithoutStatusChange: DisputePlan["flaggedWithoutStatusChange"] = [
    ...tickets.map((r) => ({ table: "tickets" as const, id: r.id })),
    ...livePurchases.map((r) => ({ table: "live_purchases" as const, id: r.id })),
  ];

  const creatorIdsToNotify = Array.from(
    new Set(
      [...productPurchases, ...tickets, ...livePurchases]
        .map((r) => r.creator_id)
        .filter((c): c is string => !!c),
    ),
  );

  const identified =
    productPurchaseIdsToMarkDisputed.length > 0 || flaggedWithoutStatusChange.length > 0;

  const amountText = `$${(((dispute.amountCents ?? 0)) / 100).toFixed(2)}`;
  const reasonText = dispute.reason ? ` (reason: ${dispute.reason})` : "";
  const piText = dispute.paymentIntentId || "unknown payment intent";

  return {
    identified,
    productPurchaseIdsToMarkDisputed,
    flaggedWithoutStatusChange,
    creatorIdsToNotify,
    notificationType: "dispute",
    creatorTitle: "⚠️ Payment Disputed",
    creatorMessage:
      `A buyer disputed a ${amountText} payment${reasonText}. ` +
      `Funds may be withdrawn by Stripe while the dispute is reviewed. ` +
      `Access has NOT been revoked.`,
    adminTitle: identified ? "Chargeback dispute opened" : "Chargeback dispute — unmatched payment",
    adminMessage:
      `Dispute ${dispute.disputeId} for ${amountText} on ${piText}${reasonText}. ` +
      (identified
        ? `Matched ${productPurchaseIdsToMarkDisputed.length} product purchase(s), ` +
          `${tickets.length} ticket(s), ${livePurchases.length} live purchase(s).`
        : `No purchase record matched this payment intent — manual review required.`),
    revokeAccess: false,
  };
}
