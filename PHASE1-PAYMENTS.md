# PHASE1-PAYMENTS — Stripe Webhook Hardening (test-first)

Scope of this document: the webhook-hardening workstream only — tests added, pass
matrix, and the full before/after diff of every `stripe-webhook` hunk changed.
**Nothing here is committed** — the coordinator reviews the webhook diff before
committing.

Owner conditions honored:

- Every webhook change covered by a test written **before** the change
  (`src/test/stripe-webhook-logic.test.ts` was run against stub behavior first:
  20 failed / 15 passed, then the real logic was implemented: 35/35 pass).
- Signature verification: **untouched** (`constructEventAsync` + tolerance window).
- Idempotency: **untouched** — the atomic `stripe_event_id` claim and the
  per-PI wallet guard in `updateWallet` are byte-identical. The new refund
  ledger row deliberately does NOT set `stripe_payment_intent_id`, because
  `updateWallet`'s guard `maybeSingle()`s completed transactions by PI and a
  second row with the same PI would break it (refunds key on `reference_id`).
- 95/5 payout math: **untouched** — clawbacks reverse the *previously credited*
  net amount from the original `earn` transaction; the split is never recomputed.
- `supabase/functions/mux-webhook`: **untouched**.
- All tests are offline; no Stripe API is called anywhere in the tests.

## Files

| File | Status |
|---|---|
| `supabase/functions/_shared/stripeWebhookLogic.ts` | NEW — pure, zero-import decision logic (Deno + vitest both import it) |
| `src/test/stripe-webhook-logic.test.ts` | NEW — 35 tests, written first |
| `supabase/functions/stripe-webhook/index.ts` | MODIFIED — +234 / −13 (diff below) |
| `supabase/migrations/20260706180000_refund_clawback.sql` | NEW — additive guard table, RLS service-role-only |

## Extraction (behavior-preserving)

`_shared` relative imports are the established pattern (`eventsCors.ts`,
`anthropic.ts`, `claudeChat.ts` are imported the same way by other functions).
The new module has **zero** imports so vitest can load it via a plain relative
path.

- `classifyPurchaseType(metadata)` — exact extraction of the
  `checkout.session.completed` branch selection, including the
  `|| "subscription"` default and the legacy fallback for unknown types
  (e.g. `cart`, which no-ops without `member_id`/`creator_id`).
- `shouldCreateFulfillment({ liveProductType, metadataContext })` — change 3.
- `computeRefundWalletAdjustment(input)` + `extractRefundIdentifier(charge)` — change 2.
- `planDisputeActions(dispute, matches)` — change 1.

## The three changes

### 1. `charge.dispute.created` (new branch — was entirely unhandled, P0)

- Finds the purchase by `stripe_payment_intent_id` across `product_purchases`,
  `tickets`, `live_purchases`.
- Marks `product_purchases.status = 'disputed'` (verified safe: the download
  gate in `get-product-download` only denies `status = 'refunded'`, so this
  does not revoke access).
- **Policy decision — never auto-revoke on dispute** (chargebacks are
  contested). Consequence: `tickets.status` and `live_purchases.status` are NOT
  flipped, because those columns *gate access* (`record_scan` requires
  `status='active'`; `has_stream_ppv_access` requires `status='completed'`).
  Those matches are surfaced in the admin alert instead
  (`plan.flaggedWithoutStatusChange`).
- In-app notification to each matched creator (`notifications`, type
  `"dispute"`, `reference_id = dispute.id`).
- Admin visibility via the existing `notify_admin` RPC (batching + dedup
  pattern already used platform-wide), `p_dedup_key = dispute.id`.
- Unknown PI: nothing marked, admin still alerted, `logStep` + normal 200 —
  never throws.

### 2. `charge.refunded` wallet clawback (extends existing branch)

Existing `access_grants` revocation is unchanged; the clawback is appended:

- Reverses the previously credited net (the original `earn` transaction's
  `net_amount`, i.e. the 95% share), proportional to `amount_refunded / amount`
  on partial refunds; full refunds reverse exactly what was credited (no
  rounding drift from re-deriving 95%).
- Cumulative-safe: `amount_refunded` is cumulative in Stripe, so prior
  clawbacks for the PI are summed from the guard table and only the delta is
  taken — correct for successive partial refunds AND idempotent on redelivery.
- Wallet is floored at zero; the unrecoverable remainder is reported as
  `shortfall` — recorded on the guard row, embedded in the ledger description,
  and logged via `logStep("Refund clawback SHORTFALL …")`.
- Ledger: `transactions` row, `type: "refund"`, negative `amount`/`net_amount`,
  `reference_id = refund id` (PI intentionally omitted — see idempotency note
  above).
- Idempotency per refund id: `stripe_refund_clawbacks.refund_id UNIQUE` insert
  claim (migration `20260706180000_refund_clawback.sql`, RLS enabled with no
  policies = service-role-only). Refund id = newest Stripe refund id, falling
  back to `chargeId:amount_refunded` when refunds aren't expanded on the event.
- Fail-safe: if the guard table is missing (migration not yet deployed), the
  clawback is skipped with a loud log — behavior degrades to today's, never to
  a double-decrement.

### 3. Skip phantom fulfillments for PPV access purchases

The `live_product` branch created a `live_purchase_fulfillments` row
unconditionally. Now the purchased `live_products.type` is checked:
`ppv_access` (or checkout `metadata.context === "ppv"`, which
`stripe-create-live-purchase` sets for PPV) skips the fulfillment row — a PPV
entitlement ships nothing. All other types (`sell`, `auction`, unknown)
keep today's behavior.

## Tests (35 — all passing)

`npx vitest run src/test/stripe-webhook-logic.test.ts` → **35 passed** (run
against the stub first: 20 failed / 15 passed).

| Group | Tests | Covers |
|---|---|---|
| `classifyPurchaseType` regression | 8 | product / course / subscription / default-to-subscription / null metadata / **cart no-op fallback** / unknown fallback / track+tip+event_ticket+credits+live_product — proves extraction is behavior-preserving |
| `shouldCreateFulfillment` | 6 | sell + auction + unknown-type regressions (still create), ppv_access skip, metadata-context ppv skip, case-insensitivity |
| `computeRefundWalletAdjustment` | 10 | full-refund clawback, partial proportional (95% of refunded), cent rounding, floor-at-zero + shortfall, negative-balance no-take, double-delivery idempotence, successive-partial delta, no-prior-credit no-op, zero-refund no-op, over-refund cap |
| `extractRefundIdentifier` | 3 | Stripe refund id preferred, fallback key, distinct-per-partial / stable-per-redelivery |
| `planDisputeActions` | 8 | product-purchase marking + creator notify, never-revoke policy (both paths), ticket flag w/o status flip, live-purchase flag w/o status flip, creator dedupe, unknown-PI safety (admin still alerted), no-PI-at-all never-throws, null-tolerant rows |

Verification matrix:

| Check | Result |
|---|---|
| `npx vitest run src/test/stripe-webhook-logic.test.ts` | 35/35 pass |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | success (vite + PWA) |

## Full before/after diff — `supabase/functions/stripe-webhook/index.ts`

```diff
diff --git a/supabase/functions/stripe-webhook/index.ts b/supabase/functions/stripe-webhook/index.ts
index 26552e2e..a6f5e8bc 100644
--- a/supabase/functions/stripe-webhook/index.ts
+++ b/supabase/functions/stripe-webhook/index.ts
@@ -1,5 +1,12 @@
 import Stripe from "https://esm.sh/stripe@18.5.0";
 import { createClient } from "npm:@supabase/supabase-js@2.57.2";
+import {
+  classifyPurchaseType,
+  shouldCreateFulfillment,
+  computeRefundWalletAdjustment,
+  extractRefundIdentifier,
+  planDisputeActions,
+} from "../_shared/stripeWebhookLogic.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
@@ -235,8 +242,10 @@ Deno.serve(async (req) => {
         const session = event.data.object as Stripe.Checkout.Session;
         const metadata = session.metadata || {};
         const purchaseType = metadata.purchase_type || "subscription";
+        // Branch routing extracted to pure logic (tested in src/test/stripe-webhook-logic.test.ts)
+        const branch = classifyPurchaseType(metadata);
 
-        if (purchaseType === "track") {
+        if (branch === "track") {
           // Locked-track one-time unlock. Mirrors the product/course branch.
           const { buyer_id, track_id, creator_id } = metadata;
           const amount = (session.amount_total || 0) / 100;
@@ -281,7 +290,7 @@ Deno.serve(async (req) => {
             console.error("track purchase missing buyer_id or track_id", metadata);
           }
 
-        } else if (purchaseType === "tip") {
+        } else if (branch === "tip") {
           const { sender_id, creator_id, stream_id, message, amount } = metadata;
           const tipAmount = parseFloat(amount || "0");
           const fee = Math.round(tipAmount * 0.05 * 100) / 100;
@@ -297,7 +306,7 @@ Deno.serve(async (req) => {
           await updateWallet(supabase, creator_id, tipAmount, fee, "Tip from viewer", session.payment_intent as string);
           logStep("Tip processed", { sender_id, creator_id, amount: tipAmount });
 
-        } else if (purchaseType === "product" || purchaseType === "course") {
+        } else if (branch === "product_course") {
           const { buyer_id, product_id, creator_id } = metadata;
           const amount = (session.amount_total || 0) / 100;
           const fee = Math.round(amount * 0.05 * 100) / 100;
@@ -371,7 +380,7 @@ Deno.serve(async (req) => {
           await updateWallet(supabase, creator_id, amount, fee, `Product sale: ${productName}`, session.payment_intent as string);
           logStep("Product/course purchase processed", { buyer_id, product_id, amount });
 
-        } else if (purchaseType === "event_ticket") {
+        } else if (branch === "event_ticket") {
           const { event_id, buyer_id, creator_id } = metadata;
           const qty = parseInt(metadata.quantity || "1", 10) || 1;
           const seatLabels: string[] = (metadata.seat_labels || "")
@@ -432,7 +441,7 @@ Deno.serve(async (req) => {
 
           logStep("Event ticket processed", { event_id, buyer_id, amount });
 
-        } else if (purchaseType === "credits") {
+        } else if (branch === "credits") {
           const { buyer_id } = metadata;
           const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
           const priceId = lineItems.data[0]?.price?.id;
@@ -456,7 +465,7 @@ Deno.serve(async (req) => {
             }
           }
 
-        } else if (purchaseType === "subscription") {
+        } else if (branch === "subscription") {
           // Subscription checkout
           const { member_id, creator_id, tier_id, space_id } = metadata;
           if (member_id && creator_id) {
@@ -628,7 +637,7 @@ Deno.serve(async (req) => {
 
             logStep("Subscription checkout completed", { member_id, creator_id });
           }
-        } else if (purchaseType === "live_product") {
+        } else if (branch === "live_product") {
           const { live_product_id, buyer_id, creator_id } = metadata;
           if (!live_product_id || !buyer_id || !creator_id) {
             logStep("Missing live_product metadata", metadata);
@@ -665,12 +674,20 @@ Deno.serve(async (req) => {
               });
             }
 
-            // Auto-create unfulfilled fulfillment record
-            await supabase.from("live_purchase_fulfillments").insert({
-              purchase_id: purchase.id,
-              creator_id,
-              status: "unfulfilled",
-            });
+            // Auto-create unfulfilled fulfillment record — except for PPV
+            // access purchases (digital entitlement, nothing to ship). Keeps
+            // creator fulfillment queues clean.
+            const { data: lpTypeRow } = await supabase
+              .from("live_products").select("type").eq("id", live_product_id).maybeSingle();
+            if (shouldCreateFulfillment({ liveProductType: lpTypeRow?.type, metadataContext: metadata.context })) {
+              await supabase.from("live_purchase_fulfillments").insert({
+                purchase_id: purchase.id,
+                creator_id,
+                status: "unfulfilled",
+              });
+            } else {
+              logStep("Fulfillment skipped (PPV access purchase)", { live_product_id });
+            }
           }
 
           // Credit creator wallet (95% of sale amount)
@@ -927,6 +944,82 @@ Deno.serve(async (req) => {
         break;
       }
 
+      case "charge.dispute.created": {
+        const dispute = event.data.object as Stripe.Dispute;
+        const disputePi = typeof dispute.payment_intent === "string"
+          ? dispute.payment_intent
+          : (dispute.payment_intent as any)?.id ?? null;
+
+        // Find the purchase by payment intent across the purchase tables.
+        // An unknown PI is NOT an error — log, alert admins, ack 200.
+        let dpProductPurchases: Array<{ id: string; creator_id: string | null }> = [];
+        let dpTickets: Array<{ id: string; creator_id: string | null }> = [];
+        let dpLivePurchases: Array<{ id: string; creator_id: string | null }> = [];
+        if (disputePi) {
+          const { data: pp } = await supabase
+            .from("product_purchases").select("id, creator_id")
+            .eq("stripe_payment_intent_id", disputePi);
+          const { data: tks } = await supabase
+            .from("tickets").select("id, creator_id")
+            .eq("stripe_payment_intent_id", disputePi);
+          const { data: lps } = await supabase
+            .from("live_purchases").select("id, creator_id")
+            .eq("stripe_payment_intent_id", disputePi);
+          dpProductPurchases = pp || [];
+          dpTickets = tks || [];
+          dpLivePurchases = lps || [];
+        }
+
+        const plan = planDisputeActions(
+          { disputeId: dispute.id, paymentIntentId: disputePi, amountCents: dispute.amount, reason: dispute.reason },
+          { productPurchases: dpProductPurchases, tickets: dpTickets, livePurchases: dpLivePurchases },
+        );
+
+        // POLICY: do NOT auto-revoke access — chargebacks are contested and may
+        // be won. plan.revokeAccess is always false by design. Ticket and
+        // live-purchase statuses are also left untouched (they gate scanning /
+        // PPV access); those matches surface via the admin alert instead.
+        if (plan.productPurchaseIdsToMarkDisputed.length > 0) {
+          await supabase.from("product_purchases")
+            .update({ status: "disputed" })
+            .in("id", plan.productPurchaseIdsToMarkDisputed);
+        }
+
+        for (const disputedCreatorId of plan.creatorIdsToNotify) {
+          await supabase.from("notifications").insert({
+            user_id: disputedCreatorId,
+            type: plan.notificationType,
+            title: plan.creatorTitle,
+            message: plan.creatorMessage,
+            reference_id: dispute.id,
+            link: "/dashboard",
+          });
+        }
+
+        // Admin visibility — reuse the notify_admin batching/dedup pattern.
+        const { error: disputeAdminErr } = await supabase.rpc("notify_admin", {
+          p_title: plan.adminTitle,
+          p_body: plan.adminMessage,
+          p_type: plan.notificationType,
+          p_link: "/admin",
+          p_metadata: { dispute_id: dispute.id, payment_intent: disputePi },
+          p_amount: (dispute.amount || 0) / 100,
+          p_dedup_key: dispute.id,
+        });
+        if (disputeAdminErr) {
+          logStep("notify_admin failed (non-fatal)", { error: disputeAdminErr.message });
+        }
+
+        logStep("Dispute recorded", {
+          disputeId: dispute.id,
+          paymentIntent: disputePi,
+          identified: plan.identified,
+          markedDisputed: plan.productPurchaseIdsToMarkDisputed.length,
+          flaggedWithoutStatusChange: plan.flaggedWithoutStatusChange.length,
+        });
+        break;
+      }
+
       case "charge.refunded": {
         const charge = event.data.object as Stripe.Charge;
         const paymentIntentId = charge.payment_intent as string;
@@ -938,6 +1031,134 @@ Deno.serve(async (req) => {
             .is("revoked_at", null);
 
           logStep("Charge refunded, access revoked", { paymentIntentId });
+
+          // ── Wallet clawback: reverse the previously-credited net (95% share),
+          // proportional on partial refunds, floored at zero. ──
+          const refundId = extractRefundIdentifier(charge as any);
+
+          // Per-refund idempotency claim — UNIQUE(refund_id) means only one
+          // delivery of this refund proceeds. If a prior attempt claimed the
+          // row but crashed before applying (clawback_amount still NULL), the
+          // retry may proceed; concurrent same-event races are already
+          // serialized by the stripe_event_id claim above.
+          let proceedWithClawback = false;
+          const { data: clawClaim, error: clawClaimErr } = await supabase
+            .from("stripe_refund_clawbacks")
+            .insert({
+              refund_id: refundId,
+              stripe_charge_id: charge.id,
+              stripe_payment_intent_id: paymentIntentId,
+            })
+            .select("id")
+            .maybeSingle();
+          if (clawClaim) {
+            proceedWithClawback = true;
+          } else if (clawClaimErr?.code === "23505" || clawClaimErr?.message?.includes("duplicate")) {
+            const { data: existingClaw } = await supabase
+              .from("stripe_refund_clawbacks")
+              .select("clawback_amount")
+              .eq("refund_id", refundId)
+              .maybeSingle();
+            if (existingClaw && existingClaw.clawback_amount !== null) {
+              logStep("Refund clawback skipped (already applied)", { refundId, paymentIntentId });
+            } else {
+              proceedWithClawback = true; // prior attempt crashed before applying
+            }
+          } else {
+            // Guard table unavailable (migration not deployed?) — fail safe:
+            // keep today's behavior (no clawback) and log loudly.
+            logStep("Refund clawback unavailable — guard claim failed", {
+              refundId, paymentIntentId, error: clawClaimErr?.message,
+            });
+          }
+
+          if (proceedWithClawback) {
+            // The original wallet credit for this payment (95% net "earn" row)
+            const { data: earnTx } = await supabase
+              .from("transactions")
+              .select("id, wallet_id, net_amount")
+              .eq("stripe_payment_intent_id", paymentIntentId)
+              .eq("type", "earn")
+              .eq("status", "completed")
+              .maybeSingle();
+
+            if (!earnTx?.wallet_id || !(Number(earnTx.net_amount) > 0)) {
+              logStep("Refund clawback skipped (no prior wallet credit)", { paymentIntentId, refundId });
+            } else {
+              // Prior clawbacks for this PI (handles successive partial refunds)
+              const { data: priorClaws } = await supabase
+                .from("stripe_refund_clawbacks")
+                .select("clawback_amount")
+                .eq("stripe_payment_intent_id", paymentIntentId)
+                .neq("refund_id", refundId);
+              const alreadyClawedBack = (priorClaws || [])
+                .reduce((sum: number, r: any) => sum + (Number(r.clawback_amount) || 0), 0);
+
+              const { data: clawWallet } = await supabase
+                .from("wallets")
+                .select("id, available_balance")
+                .eq("id", earnTx.wallet_id)
+                .maybeSingle();
+
+              const adj = computeRefundWalletAdjustment({
+                amountCents: charge.amount || 0,
+                amountRefundedCents: charge.amount_refunded || 0,
+                priorCreditedNet: Number(earnTx.net_amount) || 0,
+                alreadyClawedBack,
+                walletAvailableBalance: Number(clawWallet?.available_balance) || 0,
+              });
+
+              if (adj.clawback <= 0) {
+                logStep("Refund clawback no-op (nothing left to claw back)", { paymentIntentId, refundId });
+              } else {
+                // Ledger row: type "refund", negative net_amount.
+                // NOTE: stripe_payment_intent_id intentionally NOT set here —
+                // updateWallet's idempotency guard maybeSingle()s completed
+                // transactions by PI; a second row with the same PI would break
+                // that guard. The refund is keyed by reference_id instead.
+                await supabase.from("transactions").insert({
+                  wallet_id: earnTx.wallet_id,
+                  amount: -adj.clawback,
+                  net_amount: -adj.clawback,
+                  platform_fee_amount: 0,
+                  type: "refund",
+                  status: "completed",
+                  reference_id: refundId,
+                  description: adj.shortfall > 0
+                    ? `Refund clawback for ${paymentIntentId} — wallet floored at zero, shortfall $${adj.shortfall.toFixed(2)}`
+                    : `Refund clawback for ${paymentIntentId}`,
+                  completed_at: new Date().toISOString(),
+                });
+
+                if (clawWallet && adj.walletDecrement > 0) {
+                  await supabase.from("wallets")
+                    .update({ available_balance: adj.newBalance })
+                    .eq("id", clawWallet.id);
+                }
+
+                // Record the applied amounts on the guard row
+                await supabase.from("stripe_refund_clawbacks")
+                  .update({
+                    wallet_id: earnTx.wallet_id,
+                    clawback_amount: adj.clawback,
+                    wallet_decrement: adj.walletDecrement,
+                    shortfall: adj.shortfall,
+                  })
+                  .eq("refund_id", refundId);
+
+                if (adj.shortfall > 0) {
+                  logStep("Refund clawback SHORTFALL (wallet floored at zero)", {
+                    paymentIntentId, refundId,
+                    clawback: adj.clawback, recovered: adj.walletDecrement, shortfall: adj.shortfall,
+                  });
+                }
+                logStep("Refund clawback applied", {
+                  paymentIntentId, refundId,
+                  clawback: adj.clawback, walletDecrement: adj.walletDecrement, newBalance: adj.newBalance,
+                });
+              }
+            }
+          }
         }
         break;
       }
```

## Deferred / notes for the coordinator

- Deploy `20260706180000_refund_clawback.sql` before (or with) the webhook —
  until then, clawback logs `Refund clawback unavailable` and skips (safe).
- After deploying the migration, regenerate `src/integrations/supabase/types.ts`
  (the webhook uses the service-role client untyped, so nothing breaks either way).
- Disputes on *subscription* payments (invoice PIs) won't match the three
  purchase tables → they surface as unmatched admin alerts. Mapping
  invoice→subscription would require a Stripe API call inside the webhook;
  deliberately out of scope (handle out-of-band per CLAUDE.md).
- `charge.dispute.closed` (win/loss reconciliation, e.g. clawing back on a lost
  dispute) is intentionally NOT implemented — the no-auto-revoke policy means
  closure handling is a product decision; funds movement on disputes is done by
  Stripe directly, not by the wallet ledger.
- `deno check` was not run (Deno CLI not installed on this box); the shared
  module is fully typechecked via `tsc` (the test imports pull it into the app
  project) and follows the existing `../_shared/*.ts` import pattern.
