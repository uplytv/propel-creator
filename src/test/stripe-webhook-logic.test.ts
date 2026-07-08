import { describe, it, expect } from "vitest";
import {
  classifyPurchaseType,
  shouldCreateFulfillment,
  computeRefundWalletAdjustment,
  extractRefundIdentifier,
  planDisputeActions,
  planLivePurchaseKeys,
  soldOutOutcome,
  walletCreditGuard,
  buildWalletCreditRpcArgs,
  isMissingRpcError,
} from "../../supabase/functions/_shared/stripeWebhookLogic";

// ═══════════════════════════════════════════════════════════════════════════
// REGRESSION — classifyPurchaseType must reproduce the webhook's existing
// branch selection exactly (proves the extraction is behavior-preserving).
// ═══════════════════════════════════════════════════════════════════════════
describe("classifyPurchaseType (behavior-preserving extraction)", () => {
  it("routes product to the product/course branch", () => {
    expect(classifyPurchaseType({ purchase_type: "product" })).toBe("product_course");
  });

  it("routes course to the product/course branch", () => {
    expect(classifyPurchaseType({ purchase_type: "course" })).toBe("product_course");
  });

  it("routes subscription to the subscription branch", () => {
    expect(classifyPurchaseType({ purchase_type: "subscription" })).toBe("subscription");
  });

  it("defaults missing purchase_type to subscription (current `|| \"subscription\"` behavior)", () => {
    expect(classifyPurchaseType({})).toBe("subscription");
    expect(classifyPurchaseType({ purchase_type: "" })).toBe("subscription");
    expect(classifyPurchaseType({ purchase_type: null })).toBe("subscription");
  });

  it("defaults null/undefined metadata to subscription", () => {
    expect(classifyPurchaseType(null)).toBe("subscription");
    expect(classifyPurchaseType(undefined)).toBe("subscription");
  });

  it("routes cart to the legacy fallback (no-op without member_id/creator_id)", () => {
    // Cart orders are finalized by finalize-cart-order, not the webhook. Today
    // they fall into the final else-branch which no-ops without member_id.
    expect(classifyPurchaseType({ purchase_type: "cart" })).toBe("legacy_fallback");
  });

  it("routes unknown purchase types to the legacy fallback", () => {
    expect(classifyPurchaseType({ purchase_type: "mystery_meat" })).toBe("legacy_fallback");
  });

  it("routes track / tip / event_ticket / credits / live_product to their branches", () => {
    expect(classifyPurchaseType({ purchase_type: "track" })).toBe("track");
    expect(classifyPurchaseType({ purchase_type: "tip" })).toBe("tip");
    expect(classifyPurchaseType({ purchase_type: "event_ticket" })).toBe("event_ticket");
    expect(classifyPurchaseType({ purchase_type: "credits" })).toBe("credits");
    expect(classifyPurchaseType({ purchase_type: "live_product" })).toBe("live_product");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE 3 — skip phantom fulfillments for PPV access purchases
// ═══════════════════════════════════════════════════════════════════════════
describe("shouldCreateFulfillment (PPV access skip)", () => {
  it("still creates fulfillments for regular sell products (regression)", () => {
    expect(shouldCreateFulfillment({ liveProductType: "sell" })).toBe(true);
  });

  it("still creates fulfillments for auction products (regression)", () => {
    expect(shouldCreateFulfillment({ liveProductType: "auction" })).toBe(true);
  });

  it("still creates fulfillments when the product type is unknown (regression: fail open)", () => {
    expect(shouldCreateFulfillment({})).toBe(true);
    expect(shouldCreateFulfillment({ liveProductType: null })).toBe(true);
    expect(shouldCreateFulfillment({ liveProductType: undefined, metadataContext: null })).toBe(true);
  });

  it("skips fulfillment when live_products.type is ppv_access", () => {
    expect(shouldCreateFulfillment({ liveProductType: "ppv_access" })).toBe(false);
  });

  it("skips fulfillment when checkout metadata context is ppv", () => {
    expect(shouldCreateFulfillment({ liveProductType: "sell", metadataContext: "ppv" })).toBe(false);
  });

  it("is case-insensitive on both signals", () => {
    expect(shouldCreateFulfillment({ liveProductType: "PPV_ACCESS" })).toBe(false);
    expect(shouldCreateFulfillment({ metadataContext: "PPV" })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE 2 — charge.refunded wallet clawback math
// ═══════════════════════════════════════════════════════════════════════════
describe("computeRefundWalletAdjustment (clawback math)", () => {
  it("claws back the full previously-credited net on a full refund", () => {
    // $100 sale → creator was credited $95 (95%). Full refund → claw back $95.
    const r = computeRefundWalletAdjustment({
      amountCents: 10000,
      amountRefundedCents: 10000,
      priorCreditedNet: 95,
      walletAvailableBalance: 200,
    });
    expect(r.clawback).toBe(95);
    expect(r.walletDecrement).toBe(95);
    expect(r.shortfall).toBe(0);
    expect(r.newBalance).toBe(105);
  });

  it("claws back proportionally (95% of the refunded amount) on a partial refund", () => {
    // $100 sale, $40 refunded → claw back 95% of $40 = $38.
    const r = computeRefundWalletAdjustment({
      amountCents: 10000,
      amountRefundedCents: 4000,
      priorCreditedNet: 95,
      walletAvailableBalance: 200,
    });
    expect(r.clawback).toBe(38);
    expect(r.walletDecrement).toBe(38);
    expect(r.shortfall).toBe(0);
    expect(r.newBalance).toBe(162);
  });

  it("rounds proportional clawbacks to cents", () => {
    // $33.33 sale, fee round2(33.33*0.05)=1.67 → net 31.66. Refund $11.11.
    // Intended: round2(31.66 * 1111/3333) = round2(10.5530...) = 10.55
    const r = computeRefundWalletAdjustment({
      amountCents: 3333,
      amountRefundedCents: 1111,
      priorCreditedNet: 31.66,
      walletAvailableBalance: 500,
    });
    expect(r.clawback).toBe(10.55);
    expect(r.walletDecrement).toBe(10.55);
    expect(r.newBalance).toBe(489.45);
  });

  it("floors the wallet at zero and reports the shortfall", () => {
    // Creator already withdrew: only $40 left, but $95 must be clawed back.
    const r = computeRefundWalletAdjustment({
      amountCents: 10000,
      amountRefundedCents: 10000,
      priorCreditedNet: 95,
      walletAvailableBalance: 40,
    });
    expect(r.clawback).toBe(95);
    expect(r.walletDecrement).toBe(40);
    expect(r.shortfall).toBe(55);
    expect(r.newBalance).toBe(0);
  });

  it("takes nothing from an already-negative balance (entire clawback is shortfall)", () => {
    const r = computeRefundWalletAdjustment({
      amountCents: 10000,
      amountRefundedCents: 10000,
      priorCreditedNet: 95,
      walletAvailableBalance: -10,
    });
    expect(r.clawback).toBe(95);
    expect(r.walletDecrement).toBe(0);
    expect(r.shortfall).toBe(95);
    expect(r.newBalance).toBe(-10);
  });

  it("is idempotent on double delivery of the same full-refund event", () => {
    // Second delivery: $95 already clawed back → nothing more to take.
    const r = computeRefundWalletAdjustment({
      amountCents: 10000,
      amountRefundedCents: 10000,
      priorCreditedNet: 95,
      alreadyClawedBack: 95,
      walletAvailableBalance: 105,
    });
    expect(r.clawback).toBe(0);
    expect(r.walletDecrement).toBe(0);
    expect(r.shortfall).toBe(0);
    expect(r.newBalance).toBe(105);
  });

  it("handles successive partial refunds cumulatively (only the delta is clawed back)", () => {
    // First event: $40 of $100 refunded → clawed back $38.
    // Second event: cumulative refunded now $100 → intended total $95, minus $38 = $57.
    const r = computeRefundWalletAdjustment({
      amountCents: 10000,
      amountRefundedCents: 10000,
      priorCreditedNet: 95,
      alreadyClawedBack: 38,
      walletAvailableBalance: 162,
    });
    expect(r.clawback).toBe(57);
    expect(r.walletDecrement).toBe(57);
    expect(r.newBalance).toBe(105);
  });

  it("no-ops when nothing was ever credited (unknown or wallet-less PI)", () => {
    const r = computeRefundWalletAdjustment({
      amountCents: 10000,
      amountRefundedCents: 10000,
      priorCreditedNet: 0,
      walletAvailableBalance: 100,
    });
    expect(r.clawback).toBe(0);
    expect(r.walletDecrement).toBe(0);
    expect(r.shortfall).toBe(0);
    expect(r.newBalance).toBe(100);
  });

  it("no-ops when the refunded amount is zero", () => {
    const r = computeRefundWalletAdjustment({
      amountCents: 10000,
      amountRefundedCents: 0,
      priorCreditedNet: 95,
      walletAvailableBalance: 100,
    });
    expect(r.clawback).toBe(0);
    expect(r.newBalance).toBe(100);
  });

  it("never claws back more than the prior credit, even on over-refund", () => {
    const r = computeRefundWalletAdjustment({
      amountCents: 10000,
      amountRefundedCents: 12000, // > original (fee refunds / adjustments)
      priorCreditedNet: 95,
      walletAvailableBalance: 500,
    });
    expect(r.clawback).toBe(95);
    expect(r.newBalance).toBe(405);
  });
});

describe("extractRefundIdentifier (per-refund idempotency key)", () => {
  it("uses the newest Stripe refund id when present", () => {
    expect(
      extractRefundIdentifier({
        id: "ch_1",
        amount_refunded: 4000,
        refunds: { data: [{ id: "re_new" }, { id: "re_old" }] },
      }),
    ).toBe("re_new");
  });

  it("falls back to charge id + cumulative amount when refunds are not expanded", () => {
    expect(extractRefundIdentifier({ id: "ch_1", amount_refunded: 5000 })).toBe("ch_1:5000");
  });

  it("produces distinct fallback keys for successive partial refunds, stable per event", () => {
    const first = extractRefundIdentifier({ id: "ch_1", amount_refunded: 4000 });
    const second = extractRefundIdentifier({ id: "ch_1", amount_refunded: 10000 });
    const secondRedelivered = extractRefundIdentifier({ id: "ch_1", amount_refunded: 10000 });
    expect(first).not.toBe(second);
    expect(second).toBe(secondRedelivered);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG 1 — live purchases keyed by SESSION id instead of the payment intent.
// Completion must STORE the real PI; lookups must try the real PI first and
// fall back to the legacy session id so existing rows keep working.
// ═══════════════════════════════════════════════════════════════════════════
describe("planLivePurchaseKeys (BUG 1: PI-vs-session-id column decision)", () => {
  it("stores the REAL payment intent on the completion path (not the session id)", () => {
    const plan = planLivePurchaseKeys({ sessionId: "cs_123", paymentIntentId: "pi_456" });
    expect(plan.storeId).toBe("pi_456");
  });

  it("looks up by the real PI first, then falls back to the legacy session id", () => {
    const plan = planLivePurchaseKeys({ sessionId: "cs_123", paymentIntentId: "pi_456" });
    expect(plan.lookupOrder).toEqual(["pi_456", "cs_123"]);
  });

  it("extracts the id from an expanded payment_intent object", () => {
    const plan = planLivePurchaseKeys({
      sessionId: "cs_123",
      paymentIntentId: { id: "pi_789" },
    });
    expect(plan.storeId).toBe("pi_789");
    expect(plan.lookupOrder).toEqual(["pi_789", "cs_123"]);
  });

  it("keeps the session id when the session carries no payment intent", () => {
    const plan = planLivePurchaseKeys({ sessionId: "cs_123", paymentIntentId: null });
    expect(plan.storeId).toBe("cs_123");
    expect(plan.lookupOrder).toEqual(["cs_123"]);
  });

  it("dedupes identical keys and tolerates fully-empty input", () => {
    expect(planLivePurchaseKeys({ sessionId: "x", paymentIntentId: "x" }).lookupOrder).toEqual(["x"]);
    expect(planLivePurchaseKeys({ sessionId: null, paymentIntentId: null })).toEqual({
      storeId: null,
      lookupOrder: [],
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG 2 — sold-out ticket path: creator was credited and buyer told
// "Ticket Confirmed!" even when reserve_event_ticket failed.
// ═══════════════════════════════════════════════════════════════════════════
describe("soldOutOutcome (BUG 2: sold-out outcome matrix)", () => {
  it("reserved=true → credit the wallet and confirm the tickets (happy path unchanged)", () => {
    const o = soldOutOutcome({ reserved: true });
    expect(o.creditWallet).toBe(true);
    expect(o.confirmTickets).toBe(true);
    expect(o.issueRefund).toBe(false);
    expect(o.buyerNotification).toBe("ticket_confirmed");
    expect(o.notifyAdmin).toBe(false);
  });

  it("reserved=false → NEVER credits the creator wallet (zero tickets were issued)", () => {
    const o = soldOutOutcome({ reserved: false });
    expect(o.creditWallet).toBe(false);
  });

  it("reserved=false → no 'Ticket Confirmed!'; the buyer gets the honest sold-out message", () => {
    const o = soldOutOutcome({ reserved: false });
    expect(o.confirmTickets).toBe(false);
    expect(o.buyerNotification).toBe("sold_out_refunded");
  });

  it("reserved=false → issues a programmatic refund and alerts admins", () => {
    const o = soldOutOutcome({ reserved: false });
    expect(o.issueRefund).toBe(true);
    expect(o.notifyAdmin).toBe(true);
  });

  it("refund already issued → no double refund, still no credit, still honest notify", () => {
    const o = soldOutOutcome({ reserved: false, refundAlreadyIssued: true });
    expect(o.issueRefund).toBe(false);
    expect(o.creditWallet).toBe(false);
    expect(o.confirmTickets).toBe(false);
    expect(o.buyerNotification).toBe("sold_out_refunded");
    expect(o.notifyAdmin).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG 3 — atomic wallet credit contract (credit_wallet_atomic RPC).
// The RPC replicates updateWallet's per-PI idempotency guard exactly and the
// 95/5 net math is untouched. Mid-deploy (RPC missing) falls back to the
// legacy read-then-write path.
// ═══════════════════════════════════════════════════════════════════════════
describe("atomic wallet credit contract (BUG 3)", () => {
  it("guard short-circuits a duplicate payment intent (same semantics as updateWallet)", () => {
    expect(
      walletCreditGuard({ paymentIntentId: "pi_1", duplicateCompletedTxExists: true }),
    ).toBe("skip");
  });

  it("credits when the payment intent has no completed transaction yet", () => {
    expect(
      walletCreditGuard({ paymentIntentId: "pi_1", duplicateCompletedTxExists: false }),
    ).toBe("credit");
  });

  it("a null payment intent bypasses the guard entirely (updateWallet parity)", () => {
    expect(
      walletCreditGuard({ paymentIntentId: null, duplicateCompletedTxExists: false }),
    ).toBe("credit");
    expect(
      walletCreditGuard({ paymentIntentId: null, duplicateCompletedTxExists: true }),
    ).toBe("credit");
  });

  // 95/5 math at 3 price points — fee computed EXACTLY as every webhook call
  // site does today: Math.round(amount * 0.05 * 100) / 100.
  it("net math unchanged: $100.00 → fee $5.00, net $95.00", () => {
    const amount = 100;
    const fee = Math.round(amount * 0.05 * 100) / 100;
    const args = buildWalletCreditRpcArgs({
      creatorId: "creator_1",
      amount,
      fee,
      description: "Product sale: Test",
      paymentIntentId: "pi_100",
    });
    expect(args).toEqual({
      p_user_id: "creator_1",
      p_net: 95,
      p_gross: 100,
      p_fee: 5,
      p_description: "Product sale: Test",
      p_payment_intent_id: "pi_100",
    });
  });

  it("net math unchanged: $33.33 → fee $1.67, net $31.66", () => {
    const amount = 33.33;
    const fee = Math.round(amount * 0.05 * 100) / 100;
    const args = buildWalletCreditRpcArgs({
      creatorId: "creator_1",
      amount,
      fee,
      description: "Tip from viewer",
      paymentIntentId: "pi_33",
    });
    expect(fee).toBe(1.67);
    expect(args.p_net).toBe(31.66);
    expect(args.p_gross).toBe(33.33);
    expect(args.p_fee).toBe(1.67);
  });

  it("net math unchanged: $19.99 → fee $1.00, net $18.99", () => {
    const amount = 19.99;
    const fee = Math.round(amount * 0.05 * 100) / 100;
    const args = buildWalletCreditRpcArgs({
      creatorId: "creator_1",
      amount,
      fee,
      description: "Subscription payment",
      paymentIntentId: "pi_19",
    });
    expect(fee).toBe(1);
    expect(args.p_net).toBe(18.99);
    expect(args.p_gross).toBe(19.99);
    expect(args.p_fee).toBe(1);
  });

  it("detects a missing RPC (migration not deployed) so the webhook falls back to read-then-write", () => {
    // PostgREST: function absent from the schema cache
    expect(
      isMissingRpcError(
        { code: "PGRST202", message: "Could not find the function public.credit_wallet_atomic(p_description, p_fee, p_gross, p_net, p_payment_intent_id, p_user_id) in the schema cache" },
        "credit_wallet_atomic",
      ),
    ).toBe(true);
    // Postgres: undefined_function
    expect(
      isMissingRpcError(
        { code: "42883", message: "function public.credit_wallet_atomic(uuid, numeric, numeric, numeric, text, text) does not exist" },
        "credit_wallet_atomic",
      ),
    ).toBe(true);
  });

  it("does NOT classify ordinary errors as missing-RPC", () => {
    expect(
      isMissingRpcError({ code: "23505", message: "duplicate key value violates unique constraint" }, "credit_wallet_atomic"),
    ).toBe(false);
    expect(isMissingRpcError(null, "credit_wallet_atomic")).toBe(false);
    expect(isMissingRpcError({ code: "PGRST301", message: "JWT expired" }, "credit_wallet_atomic")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE 1 — charge.dispute.created planning
// ═══════════════════════════════════════════════════════════════════════════
describe("planDisputeActions (charge.dispute.created)", () => {
  const dispute = {
    disputeId: "dp_123",
    paymentIntentId: "pi_123",
    amountCents: 2500,
    reason: "fraudulent",
  };

  it("marks a matched product purchase disputed and notifies its creator", () => {
    const plan = planDisputeActions(dispute, {
      productPurchases: [{ id: "pp_1", creator_id: "creator_a" }],
    });
    expect(plan.identified).toBe(true);
    expect(plan.productPurchaseIdsToMarkDisputed).toEqual(["pp_1"]);
    expect(plan.creatorIdsToNotify).toEqual(["creator_a"]);
    expect(plan.notificationType).toBe("dispute");
    expect(plan.creatorTitle.length).toBeGreaterThan(0);
    expect(plan.creatorMessage).toContain("$25.00");
    expect(plan.adminMessage).toContain("dp_123");
  });

  it("NEVER auto-revokes access (chargebacks are contested)", () => {
    const identified = planDisputeActions(dispute, {
      productPurchases: [{ id: "pp_1", creator_id: "creator_a" }],
    });
    const unidentified = planDisputeActions(dispute, {});
    expect(identified.revokeAccess).toBe(false);
    expect(unidentified.revokeAccess).toBe(false);
  });

  it("flags matched tickets WITHOUT flipping status (status='active' gates scanning)", () => {
    const plan = planDisputeActions(dispute, {
      tickets: [{ id: "tk_1", creator_id: "creator_b" }],
    });
    expect(plan.identified).toBe(true);
    expect(plan.productPurchaseIdsToMarkDisputed).toEqual([]);
    expect(plan.flaggedWithoutStatusChange).toEqual([{ table: "tickets", id: "tk_1" }]);
    expect(plan.creatorIdsToNotify).toEqual(["creator_b"]);
  });

  it("flags matched live purchases WITHOUT flipping status (status='completed' gates PPV access)", () => {
    const plan = planDisputeActions(dispute, {
      livePurchases: [{ id: "lp_1", creator_id: "creator_c" }],
    });
    expect(plan.identified).toBe(true);
    expect(plan.productPurchaseIdsToMarkDisputed).toEqual([]);
    expect(plan.flaggedWithoutStatusChange).toEqual([{ table: "live_purchases", id: "lp_1" }]);
    expect(plan.creatorIdsToNotify).toEqual(["creator_c"]);
  });

  it("dedupes creators across multiple matched records", () => {
    const plan = planDisputeActions(dispute, {
      productPurchases: [
        { id: "pp_1", creator_id: "creator_a" },
        { id: "pp_2", creator_id: "creator_a" },
      ],
      tickets: [{ id: "tk_1", creator_id: "creator_a" }],
    });
    expect(plan.productPurchaseIdsToMarkDisputed).toEqual(["pp_1", "pp_2"]);
    expect(plan.creatorIdsToNotify).toEqual(["creator_a"]);
  });

  it("handles an unknown payment intent safely: nothing marked, admin still alerted", () => {
    const plan = planDisputeActions(dispute, {});
    expect(plan.identified).toBe(false);
    expect(plan.productPurchaseIdsToMarkDisputed).toEqual([]);
    expect(plan.flaggedWithoutStatusChange).toEqual([]);
    expect(plan.creatorIdsToNotify).toEqual([]);
    // Admin visibility survives even when the PI matched nothing
    expect(plan.adminTitle.length).toBeGreaterThan(0);
    expect(plan.adminMessage).toContain("pi_123");
  });

  it("handles a dispute with no payment intent at all (never throws)", () => {
    const plan = planDisputeActions(
      { disputeId: "dp_nopi", paymentIntentId: null, amountCents: 999 },
      {},
    );
    expect(plan.identified).toBe(false);
    expect(plan.creatorIdsToNotify).toEqual([]);
    expect(plan.adminMessage).toContain("dp_nopi");
    expect(plan.revokeAccess).toBe(false);
  });

  it("tolerates null/missing match rows and creators", () => {
    const plan = planDisputeActions(dispute, {
      productPurchases: [{ id: "pp_1", creator_id: null }],
      tickets: null,
      livePurchases: undefined,
    });
    expect(plan.productPurchaseIdsToMarkDisputed).toEqual(["pp_1"]);
    expect(plan.creatorIdsToNotify).toEqual([]); // no creator id → no creator notification
    expect(plan.identified).toBe(true);
  });
});
