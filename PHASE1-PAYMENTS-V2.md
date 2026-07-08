# PHASE1-PAYMENTS-V2 — Three confirmed money bugs in `stripe-webhook` (test-first)

Branch: `fable5-improvements` · **Not committed** — coordinator reviews each diff and makes the isolated `[WEBHOOK]` commits.

## Files changed

| File | +/- | What |
|---|---|---|
| `supabase/functions/stripe-webhook/index.ts` | +223 / -32 | The three fixes (only file with behavior changes in the webhook) |
| `supabase/functions/_shared/stripeWebhookLogic.ts` | +165 / -0 | Pure zero-import decision logic (additive; existing exports untouched) |
| `src/test/stripe-webhook-logic.test.ts` | +194 / -0 | 15 new tests (existing 38 untouched, still green) |
| `supabase/migrations/20260707100000_atomic_wallet_credit.sql` | new | `credit_wallet_atomic` RPC + partial index (additive only) |

**Untouched, verified by diff:** `constructEventAsync` signature verification + 300s tolerance; the atomic `stripe_event_id` claim / stale-lock (60s) block; every `Math.round(amount * 0.05 * 100) / 100` fee computation (95/5 math); mux-webhook; finalize-cart-order.

**Verification:** `npx vitest run src/test/stripe-webhook-logic.test.ts` → **53/53 passed** (38 pre-existing + 15 new) · `npx tsc --noEmit` → exit 0 · `npm run build` → ✓ built in 12.4s. Webhook file (Deno, outside tsc project) syntax-checked with esbuild.

---

## Red → green evidence

Process per bug: stubs were first added to `_shared/stripeWebhookLogic.ts` encoding the **current (buggy) webhook behavior** (Bug 1: store/lookup session id; Bug 2: always credit+confirm; Bug 3: not implemented), tests written against the intended behavior, run **red**, then the real logic implemented and the webhook rewired. Captured red run: `Tests 15 failed | 38 passed (53)`.

### BUG 1 — red (stub reproduced today's "session id in the PI column")

```
× planLivePurchaseKeys (BUG 1: PI-vs-session-id column decision) > stores the REAL payment intent on the completion path (not the session id)
  → expected 'cs_123' to be 'pi_456' // Object.is equality
× planLivePurchaseKeys (BUG 1: PI-vs-session-id column decision) > looks up by the real PI first, then falls back to the legacy session id
  → expected [ 'cs_123' ] to deeply equal [ 'pi_456', 'cs_123' ]
× planLivePurchaseKeys (BUG 1: PI-vs-session-id column decision) > extracts the id from an expanded payment_intent object
  → expected 'cs_123' to be 'pi_789' // Object.is equality
```

### BUG 2 — red (stub reproduced today's fall-through to credit + "Ticket Confirmed!")

```
× soldOutOutcome (BUG 2: sold-out outcome matrix) > reserved=false → NEVER credits the creator wallet (zero tickets were issued)
  → expected true to be false // Object.is equality
× soldOutOutcome (BUG 2: sold-out outcome matrix) > reserved=false → no 'Ticket Confirmed!'; the buyer gets the honest sold-out message
  → expected true to be false // Object.is equality
× soldOutOutcome (BUG 2: sold-out outcome matrix) > reserved=false → issues a programmatic refund and alerts admins
  → expected false to be true // Object.is equality
× soldOutOutcome (BUG 2: sold-out outcome matrix) > refund already issued → no double refund, still no credit, still honest notify
  → expected true to be false // Object.is equality
```

### BUG 3 — red (contract not implemented)

```
× atomic wallet credit contract (BUG 3) > guard short-circuits a duplicate payment intent (same semantics as updateWallet)   Error: not implemented
× atomic wallet credit contract (BUG 3) > credits when the payment intent has no completed transaction yet                   Error: not implemented
× atomic wallet credit contract (BUG 3) > a null payment intent bypasses the guard entirely (updateWallet parity)            Error: not implemented
× atomic wallet credit contract (BUG 3) > net math unchanged: $100.00 → fee $5.00, net $95.00                                Error: not implemented
× atomic wallet credit contract (BUG 3) > net math unchanged: $33.33 → fee $1.67, net $31.66                                 Error: not implemented
× atomic wallet credit contract (BUG 3) > net math unchanged: $19.99 → fee $1.00, net $18.99                                 Error: not implemented
× atomic wallet credit contract (BUG 3) > detects a missing RPC (migration not deployed) so the webhook falls back ...       Error: not implemented
× atomic wallet credit contract (BUG 3) > does NOT classify ordinary errors as missing-RPC                                   Error: not implemented
```

### Green

After implementation: **53/53 passed**, including the pre-existing `classifyPurchaseType (behavior-preserving extraction)` describe block (8 tests) which is the required regression proof that purchase-type classification behaves identically.

---

## BUG 1 — live purchases keyed by SESSION id, not the payment intent

**Root cause.** `stripe-create-live-purchase` inserts the pending `live_purchases` row with `stripe_payment_intent_id: session.id` (the real PI does not exist until payment). The webhook completion path then matched by `session.id` and never upgraded the column, so `charge.refunded` / `charge.dispute.created` lookups by the **real** PI could never find a live purchase.

**Fix (additive, no backfill).**
- Completion path (`live_product` branch): dual lookup — real PI first, legacy session id fallback (`planLivePurchaseKeys.lookupOrder`) — then the row is updated by `id` with `status: "completed"` **and** `stripe_payment_intent_id: <real PI>` (`storeId`). New rows are self-healing; pre-fix pending rows still resolve via the session-id fallback.
- Dispute branch (`charge.dispute.created`): if the PI matches no `live_purchases` row, resolve the PI's checkout session via `stripe.checkout.sessions.list({ payment_intent, limit: 1 })` and retry with the session id — so **existing completed rows (which carry session ids) keep working**. Best-effort: wrapped so a Stripe API failure never fails the event.
- `stripe-create-live-purchase` deliberately untouched (the PI genuinely doesn't exist at insert time).

**All other `live_purchases` readers audited:**

| Reader | Matches on | Action |
|---|---|---|
| `charge.dispute.created` (webhook) | `stripe_payment_intent_id` | **Fallback added** (session-id resolution, above) |
| `charge.refunded` (webhook) | `transactions.stripe_payment_intent_id` — not live_purchases; transactions always carried the **real** PI (updateWallet was called with `session.payment_intent`) | No change needed |
| `has_stream_ppv_access` (DB fn, 20260706160000) | `buyer_id + live_product_id + status='completed'` | Unaffected — no PI |
| `stripe-create-live-purchase` PPV dedupe | `live_product_id + buyer_id + status` | Unaffected |
| `src/hooks/useLiveShop.ts` (owned state, revenue) | `buyer_id`/`creator_id` + `live_product_id` + status | Unaffected |
| `src/components/live/PPVPaywall.tsx` (realtime unlock) | `buyer_id` + status | Unaffected |
| `src/hooks/useAdminHealthData.ts` | aggregates, no PI | Unaffected |
| `end-live-auction` | inserts rows with NULL PI | Unaffected |

**Recommendation (deferred, per instruction — no backfill UPDATE in this pass):** a one-off backfill for completed rows whose `stripe_payment_intent_id` starts with `cs_` — resolve each session via Stripe and rewrite to the PI — would let the dispute fallback's extra API call retire eventually.

## BUG 2 — sold-out ticket path credited the creator and confirmed the buyer

**Root cause.** When `reserve_event_ticket` returned falsy, the handler logged "Event sold out — refund needed" and **fell through** to `updateWallet` (creator credited for zero tickets) and the "Ticket Confirmed! 🎟️" notification.

**Fix.** Decision extracted to pure `soldOutOutcome(reserved, refundAlreadyIssued)` → `{ creditWallet, confirmTickets, issueRefund, buyerNotification, notifyAdmin }` (tested matrix). On reservation failure:
- **No wallet credit, no "Ticket Confirmed!", no creator "New Ticket Sale!".**
- Programmatic full refund: `stripe.refunds.create({ payment_intent }, { idempotencyKey: "soldout-refund-<pi>" })`, wrapped in try/catch so a refund failure **never throws the handler** (event still acks; admins alerted to refund manually).
- Idempotency (three layers): (1) DB guard reusing the `stripe_refund_clawbacks` `UNIQUE(refund_id)` claim pattern from migration 20260706180000 with key `soldout:<pi>` — `clawback_amount` non-NULL marks an applied refund, NULL means a crashed attempt that may retry; (2) Stripe idempotency key; (3) `charge_already_refunded` treated as success.
- Honest buyer notification ("Event Sold Out — Payment Refunded"; softer copy if the automatic refund failed).
- Admin visibility via the same `notify_admin` batching/dedup RPC the dispute branch uses (`p_dedup_key = soldout:<pi>`), including the FAILED-refund variant.
- Outcome recorded on the guard row (`clawback_amount = refunded amount`, `wallet_decrement/shortfall = 0`) — the money trail lives in `stripe_refund_clawbacks`, and the eventual `charge.refunded` webhook event no-ops its clawback ("no prior wallet credit"), see replay analysis.

Happy path (`reserved=true`) is byte-identical: same ticket inserts, same wallet credit call, same notifications, same log line.

## BUG 3 — read-then-write wallet credit loses concurrent credits

**Root cause.** `updateWallet` SELECTed `available_balance`/`lifetime_earned`, then UPDATEd with values computed in JS. Two concurrent webhook deliveries for the same creator could both read the same balance and one credit would be lost.

**Fix.** Migration `20260707100000_atomic_wallet_credit.sql` adds SECURITY DEFINER RPC `credit_wallet_atomic(p_user_id, p_net, p_gross, p_fee, p_description, p_payment_intent_id)`:
- `pg_advisory_xact_lock` scoped to (function, user) serializes concurrent credits per creator — makes guard + wallet creation race-safe without needing a `UNIQUE(user_id)` on `wallets` (which legacy data might violate).
- **Per-PI idempotency guard replicated exactly** from `updateWallet`: any completed `transactions` row with the PI (any wallet) short-circuits (`credited:false`); NULL PI runs no guard. (Distinct from finalize-cart-order's per-(PI, wallet) guard — that flow is untouched and must NOT use this RPC; documented in the SQL header.)
- Same `transactions` row shape (`amount`=gross, `net_amount`, `platform_fee_amount`, `type:'earn'`, `status:'completed'`, PI, description, `completed_at`).
- The fix itself: `UPDATE wallets SET available_balance = COALESCE(available_balance,0) + p_net, lifetime_earned = COALESCE(lifetime_earned,0) + p_net` — a single-statement **relative** increment.
- Creates the wallet row if absent (deliberate improvement; old code silently dropped the credit).
- EXECUTE granted to `service_role` only (this function moves money).
- Bonus: partial index on `transactions(stripe_payment_intent_id) WHERE status='completed'` — the guard ran unindexed on every sale.

`updateWallet` is now a thin caller (signature unchanged — all 8 call sites untouched): builds args via pure `buildWalletCreditRpcArgs` (`p_net = round2(amount - fee)`; the 95/5 split is still computed at call sites, untouched), calls the RPC, and **falls back to `legacyReadThenWriteCredit`** — the byte-for-byte pre-fix body — when the RPC is missing (`isMissingRpcError`: code `42883`/`PGRST202` or message match), logging a structured `WARN ... — legacy read-then-write fallback` with the migration name. Unknown RPC errors also fall back (safe: the RPC is transactional so nothing partial ever lands, and the legacy guard re-checks the PI first), with a distinct structured warning.

### Duplicate-replay analysis — why no double credit

1. **Same Stripe event redelivered:** the untouched `stripe_webhook_log` atomic claim (`UNIQUE(stripe_event_id)`) short-circuits before any handler runs; `status='processed'` acks immediately; a fresh `processing` lock (<60s) acks in-flight.
2. **Crash after credit, Stripe retries the event (stale lock re-claim):** the RPC's per-PI guard finds the completed `transactions` row from attempt #1 → `credited:false`. Identical to today's guard semantics, but now atomic with the credit itself.
3. **Two deliveries racing inside the lock window (both pass the event claim in edge cases, or two different events carrying the same PI):** both call the RPC; `pg_advisory_xact_lock` serializes them per creator; the second transaction sees the first's committed `transactions` row and short-circuits. Under the legacy path this was exactly the lost-update/double-credit window — the guard SELECT and the wallet UPDATE were separate round-trips.
4. **Mid-deploy (webhook deployed, migration not applied):** RPC-missing → legacy fallback = today's exact behavior, webhook never breaks; structured warning flags the gap until the migration lands.
5. **Sold-out refund replay (Bug 2):** guard claim `soldout:<pi>` is UNIQUE — a second delivery sees `clawback_amount` non-NULL → `refundAlreadyIssued=true` → `issueRefund:false`. Even with the guard table unavailable, the Stripe idempotency key returns the original refund and `charge_already_refunded` is swallowed. And when Stripe subsequently emits `charge.refunded` for the sold-out refund, the clawback path looks up an `earn` transaction by PI, finds none (we never credited), and skips — no phantom clawback.

---

## Full webhook diff — `supabase/functions/stripe-webhook/index.ts`

```diff
@@ -6,6 +6,11 @@ import {
   computeRefundWalletAdjustment,
   extractRefundIdentifier,
   planDisputeActions,
+  planLivePurchaseKeys,
+  soldOutOutcome,
+  extractPaymentIntentId,
+  buildWalletCreditRpcArgs,
+  isMissingRpcError,
 } from "../_shared/stripeWebhookLogic.ts";
 
 const corsHeaders = {
@@ -56,7 +61,52 @@ function buildNewSubscriberEmailHtml(subscriberName: string, tierName: string, a
 </html>`;
 }
 
+// BUG 3 FIX: the wallet credit is now a single-statement atomic increment via
+// the SECURITY DEFINER RPC credit_wallet_atomic (migration 20260707100000).
+// The RPC replicates the exact semantics below (per-PI idempotency guard,
+// same transactions row shape, wallet resolution) but does guard + insert +
+// increment in ONE database transaction, so concurrent webhook deliveries
+// for the same creator can never lose a credit to a read-then-write race.
+// Signature unchanged — all call sites are untouched. If the RPC is missing
+// (migration not yet applied mid-deploy), we fall back to the legacy path.
 async function updateWallet(supabase: any, creatorId: string, amount: number, fee: number, description: string, paymentIntentId: string | null) {
+  const { data: rpcResult, error: rpcError } = await supabase.rpc(
+    "credit_wallet_atomic",
+    buildWalletCreditRpcArgs({ creatorId, amount, fee, description, paymentIntentId }),
+  );
+
+  if (!rpcError) {
+    if (rpcResult && rpcResult.credited === false) {
+      logStep("Wallet update skipped (already credited)", { paymentIntentId });
+    }
+    return;
+  }
+
+  if (isMissingRpcError(rpcError, "credit_wallet_atomic")) {
+    logStep("WARN credit_wallet_atomic missing — legacy read-then-write fallback", {
+      migration: "20260707100000_atomic_wallet_credit.sql",
+      paymentIntentId,
+      error: rpcError?.message,
+    });
+  } else {
+    // Unknown RPC failure: nothing was applied (the RPC is transactional), so
+    // the legacy path below is safe — its per-PI guard re-checks first and a
+    // credit that DID land would short-circuit it.
+    logStep("WARN credit_wallet_atomic failed — legacy read-then-write fallback", {
+      paymentIntentId,
+      code: rpcError?.code,
+      error: rpcError?.message,
+    });
+  }
+
+  await legacyReadThenWriteCredit(supabase, creatorId, amount, fee, description, paymentIntentId);
+}
+
+// LEGACY PATH — byte-for-byte the pre-fix updateWallet body. Only used when
+// the credit_wallet_atomic RPC is unavailable. Known (accepted) limitation:
+// read-then-write, so it keeps today's behavior including the race the RPC
+// eliminates. Do not extend.
+async function legacyReadThenWriteCredit(supabase: any, creatorId: string, amount: number, fee: number, description: string, paymentIntentId: string | null) {
   // Guard: skip if already credited for this payment intent (idempotency)
   if (paymentIntentId) {
     const { data: existingTx } = await supabase
@@ -393,9 +443,8 @@ Deno.serve(async (req) => {
 
           // Atomic reserve to guarantee no oversell under concurrent webhooks
           const { data: reserved } = await supabase.rpc("reserve_event_ticket", { p_event_id: event_id, p_qty: qty });
-          if (!reserved) {
-            logStep("Event sold out — refund needed", { event_id, buyer_id });
-          } else {
+
+          if (reserved) {
             const perTicketAmount = amount / qty;
             const perTicketFee = fee / qty;
             for (let i = 0; i < qty; i++) {
@@ -418,28 +467,131 @@ Deno.serve(async (req) => {
             }
           }
 
+          // BUG 2 FIX: on reservation failure the handler used to FALL THROUGH
+          // to the wallet credit and "Ticket Confirmed!" anyway — creator paid
+          // for zero tickets, buyer told a lie. Decision matrix is pure/tested
+          // (soldOutOutcome); the refund is guarded per payment intent.
+          const ticketPi = extractPaymentIntentId(session.payment_intent);
+          const soldOutRefundKey = `soldout:${ticketPi || session.id}`;
+
+          let refundAlreadyIssued = false;
+          if (!reserved) {
+            // Per-PI idempotency claim — same UNIQUE(refund_id) pattern as the
+            // charge.refunded clawback guard (migration 20260706180000).
+            const { data: refundClaim, error: refundClaimErr } = await supabase
+              .from("stripe_refund_clawbacks")
+              .insert({
+                refund_id: soldOutRefundKey,
+                stripe_payment_intent_id: ticketPi,
+              })
+              .select("id")
+              .maybeSingle();
+            if (!refundClaim && (refundClaimErr?.code === "23505" || refundClaimErr?.message?.includes("duplicate"))) {
+              const { data: existingClaim } = await supabase
+                .from("stripe_refund_clawbacks")
+                .select("clawback_amount")
+                .eq("refund_id", soldOutRefundKey)
+                .maybeSingle();
+              // Non-NULL applied amount marks a refund that fully went through;
+              // NULL means a prior attempt crashed before refunding — retry.
+              refundAlreadyIssued = !!existingClaim && existingClaim.clawback_amount !== null;
+            }
+            // Any other claim failure (e.g. guard table missing): proceed with
+            // the refund anyway — the Stripe idempotency key plus
+            // charge_already_refunded handling below make it single-shot.
+          }
+
+          const outcome = soldOutOutcome({ reserved: !!reserved, refundAlreadyIssued });
+
           const { data: evt } = await supabase.from("events").select("title").eq("id", event_id).single();
-          await updateWallet(supabase, creator_id, amount, fee, `Event ticket: ${evt?.title || "Event"}`, session.payment_intent as string);
 
-          await supabase.from("notifications").insert({
-            user_id: buyer_id,
-            type: "event_ticket",
-            title: "Ticket Confirmed! 🎟️",
-            message: `Your ticket for "${evt?.title}" is confirmed.`,
-            link: firstToken ? `/tickets/${firstToken}` : "/wallet",
-          });
+          if (outcome.creditWallet) {
+            await updateWallet(supabase, creator_id, amount, fee, `Event ticket: ${evt?.title || "Event"}`, session.payment_intent as string);
+          }
 
-          const { data: buyerProfile } = await supabase.from("profiles").select("display_name").eq("user_id", buyer_id).maybeSingle();
-          await supabase.from("notifications").insert({
-            user_id: creator_id,
-            type: "event_ticket_sale",
-            title: "New Ticket Sale! 🎉",
-            message: `${buyerProfile?.display_name || "Someone"} bought a ticket to "${evt?.title}" — $${amount.toFixed(2)}`,
-            actor_id: buyer_id,
-            link: "/events",
-          });
+          if (outcome.confirmTickets) {
+            await supabase.from("notifications").insert({
+              user_id: buyer_id,
+              type: "event_ticket",
+              title: "Ticket Confirmed! 🎟️",
+              message: `Your ticket for "${evt?.title}" is confirmed.`,
+              link: firstToken ? `/tickets/${firstToken}` : "/wallet",
+            });
+
+            const { data: buyerProfile } = await supabase.from("profiles").select("display_name").eq("user_id", buyer_id).maybeSingle();
+            await supabase.from("notifications").insert({
+              user_id: creator_id,
+              type: "event_ticket_sale",
+              title: "New Ticket Sale! 🎉",
+              message: `${buyerProfile?.display_name || "Someone"} bought a ticket to "${evt?.title}" — $${amount.toFixed(2)}`,
+              actor_id: buyer_id,
+              link: "/events",
+            });
+
+            logStep("Event ticket processed", { event_id, buyer_id, amount });
+          } else {
+            // ── Sold out: refund the buyer, never credit the creator ──
+            let refundSucceeded = refundAlreadyIssued;
+            if (outcome.issueRefund && ticketPi) {
+              // Wrapped so a refund failure NEVER throws the handler — the
+              // event still acks 200 and admins get a manual-refund alert.
+              try {
+                try {
+                  await stripe.refunds.create(
+                    { payment_intent: ticketPi },
+                    // Stripe-side idempotency: a redelivered event re-requests
+                    // the SAME refund instead of creating a second one.
+                    { idempotencyKey: `soldout-refund-${ticketPi}` },
+                  );
+                } catch (refundErr: any) {
+                  if (refundErr?.code !== "charge_already_refunded") throw refundErr;
+                }
+                refundSucceeded = true;
+                // Record the applied amount on the guard row (non-NULL = done)
+                await supabase.from("stripe_refund_clawbacks")
+                  .update({ clawback_amount: amount, wallet_decrement: 0, shortfall: 0 })
+                  .eq("refund_id", soldOutRefundKey);
+                logStep("Sold-out refund issued", { event_id, buyer_id, paymentIntent: ticketPi, amount });
+              } catch (refundErr: any) {
+                logStep("Sold-out refund FAILED — manual refund required", {
+                  event_id, buyer_id, paymentIntent: ticketPi, amount, error: refundErr?.message,
+                });
+              }
+            } else if (outcome.issueRefund && !ticketPi) {
+              logStep("Sold-out refund impossible — session has no payment intent", { event_id, buyer_id, sessionId: session.id });
+            }
+
+            // Honest buyer notification — never "Ticket Confirmed!"
+            await supabase.from("notifications").insert({
+              user_id: buyer_id,
+              type: "event_ticket",
+              title: refundSucceeded ? "Event Sold Out — Payment Refunded" : "Event Sold Out",
+              message: refundSucceeded
+                ? `"${evt?.title || "The event"}" sold out before your payment completed. Your payment has been refunded in full.`
+                : `"${evt?.title || "The event"}" sold out before your payment completed. Your refund is being processed — contact support if it doesn't arrive within 5-10 business days.`,
+              link: "/wallet",
+            });
+
+            // Admin visibility — same notify_admin batching/dedup pattern as
+            // the charge.dispute.created branch.
+            const { error: soldOutAdminErr } = await supabase.rpc("notify_admin", {
+              p_title: refundSucceeded ? "Sold-out ticket auto-refunded" : "🚨 Sold-out refund FAILED — refund manually",
+              p_body: `Event ${evt?.title || event_id} oversold: buyer ${buyer_id} paid $${amount.toFixed(2)} (PI ${ticketPi || "unknown"}) after capacity ran out. ` +
+                (refundSucceeded ? "Refund issued automatically; no wallet credit was made." : "Automatic refund FAILED — issue it manually in Stripe. No wallet credit was made."),
+              p_type: "sold_out_refund",
+              p_link: "/admin",
+              p_metadata: { event_id, buyer_id, payment_intent: ticketPi, session_id: session.id, refunded: refundSucceeded },
+              p_amount: amount,
+              p_dedup_key: soldOutRefundKey,
+            });
+            if (soldOutAdminErr) {
+              logStep("notify_admin failed (non-fatal)", { error: soldOutAdminErr.message });
+            }
 
-          logStep("Event ticket processed", { event_id, buyer_id, amount });
+            logStep("Event ticket sold out — buyer refunded, creator NOT credited", {
+              event_id, buyer_id, amount, refunded: refundSucceeded,
+            });
+          }
 
         } else if (branch === "credits") {
           const { buyer_id } = metadata;
@@ -644,18 +796,38 @@ Deno.serve(async (req) => {
             break;
           }
 
-          // Mark purchase completed
-          await supabase.from("live_purchases")
-            .update({ status: "completed" })
-            .eq("stripe_payment_intent_id", session.id)
-            .eq("live_product_id", live_product_id);
+          // BUG 1 FIX: pending rows are created by stripe-create-live-purchase
+          // with the checkout SESSION id in stripe_payment_intent_id (the real
+          // PI doesn't exist at insert time). Completion now locates the row
+          // via dual lookup (real PI first, legacy session id fallback — so
+          // existing rows keep working) and stores the REAL payment intent, so
+          // refund/dispute paths that look up by PI can find live purchases.
+          const lpKeys = planLivePurchaseKeys({
+            sessionId: session.id,
+            paymentIntentId: session.payment_intent,
+          });
 
-          // Get the purchase record for address/fulfillment
-          const { data: purchase } = await supabase
-            .from("live_purchases")
-            .select("id")
-            .eq("stripe_payment_intent_id", session.id)
-            .maybeSingle();
+          let purchase: { id: string } | null = null;
+          for (const lookupKey of lpKeys.lookupOrder) {
+            const { data: foundPurchase } = await supabase
+              .from("live_purchases")
+              .select("id")
+              .eq("stripe_payment_intent_id", lookupKey)
+              .eq("live_product_id", live_product_id)
+              .maybeSingle();
+            if (foundPurchase) { purchase = foundPurchase; break; }
+          }
+
+          // Mark purchase completed + upgrade the key to the real payment intent
+          if (purchase) {
+            await supabase.from("live_purchases")
+              .update({ status: "completed", stripe_payment_intent_id: lpKeys.storeId })
+              .eq("id", purchase.id);
+          } else {
+            logStep("live_purchases row not found for completion", {
+              live_product_id, session_id: session.id, payment_intent: lpKeys.storeId,
+            });
+          }
 
           if (purchase) {
             // Save shipping address if collected by Stripe
@@ -968,6 +1140,25 @@ Deno.serve(async (req) => {
           dpProductPurchases = pp || [];
           dpTickets = tks || [];
           dpLivePurchases = lps || [];
+
+          // BUG 1 fallback: live_purchases rows completed BEFORE the PI fix
+          // carry the checkout SESSION id in stripe_payment_intent_id. If the
+          // real PI matched nothing, resolve its session id from Stripe and
+          // retry (best-effort — a lookup failure must never fail the event).
+          if (dpLivePurchases.length === 0) {
+            try {
+              const piSessions = await stripe.checkout.sessions.list({ payment_intent: disputePi, limit: 1 });
+              const legacySessionId = piSessions.data?.[0]?.id;
+              if (legacySessionId) {
+                const { data: legacyLps } = await supabase
+                  .from("live_purchases").select("id, creator_id")
+                  .eq("stripe_payment_intent_id", legacySessionId);
+                dpLivePurchases = legacyLps || [];
+              }
+            } catch (fallbackErr: any) {
+              logStep("Dispute legacy session-id fallback failed (non-fatal)", { error: fallbackErr?.message });
+            }
+          }
         }
 
         const plan = planDisputeActions(
```

*(Note: the `legacyReadThenWriteCredit` body below the shown hunk is the unmodified pre-fix `updateWallet` body — git renders it as context, not a change.)*

---

## The RPC SQL — `supabase/migrations/20260707100000_atomic_wallet_credit.sql`

```sql
CREATE OR REPLACE FUNCTION public.credit_wallet_atomic(
  p_user_id uuid,
  p_net numeric,
  p_gross numeric,
  p_fee numeric,
  p_description text,
  p_payment_intent_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_tx_id uuid;
BEGIN
  -- Serialize concurrent credits for the same creator (transaction-scoped
  -- advisory lock, auto-released on commit/rollback). This makes BOTH the
  -- guard check below and first-credit wallet creation race-safe even though
  -- wallets has no UNIQUE(user_id) constraint we can rely on.
  PERFORM pg_advisory_xact_lock(hashtext('credit_wallet_atomic'), hashtext(p_user_id::text));

  -- Per-payment-intent idempotency guard — EXACT updateWallet semantics:
  -- any completed transaction with this PI (regardless of wallet) means the
  -- credit already happened. NULL PI = no guard, same as today.
  IF p_payment_intent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE stripe_payment_intent_id = p_payment_intent_id
        AND status = 'completed'
    ) THEN
      RETURN jsonb_build_object('credited', false, 'reason', 'duplicate_payment_intent');
    END IF;
  END IF;

  -- Resolve the creator wallet; create it on first credit. Oldest row wins if
  -- historical duplicates exist (mirrors maybeSingle()'s intent of one wallet
  -- per user without failing on legacy data).
  SELECT id INTO v_wallet_id
    FROM public.wallets
   WHERE user_id = p_user_id
   ORDER BY created_at ASC NULLS LAST
   LIMIT 1;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, available_balance, lifetime_earned)
    VALUES (p_user_id, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  -- Ledger row — same shape updateWallet inserts today.
  INSERT INTO public.transactions (
    wallet_id, amount, net_amount, platform_fee_amount,
    type, status, stripe_payment_intent_id, description, completed_at
  ) VALUES (
    v_wallet_id, p_gross, p_net, p_fee,
    'earn', 'completed', p_payment_intent_id, p_description, now()
  )
  RETURNING id INTO v_tx_id;

  -- Single-statement ATOMIC increment — the fix. No values are read into the
  -- application first, so concurrent credits can never overwrite each other.
  UPDATE public.wallets
     SET available_balance = COALESCE(available_balance, 0) + p_net,
         lifetime_earned  = COALESCE(lifetime_earned, 0) + p_net
   WHERE id = v_wallet_id;

  RETURN jsonb_build_object(
    'credited', true,
    'wallet_id', v_wallet_id,
    'transaction_id', v_tx_id
  );
END;
$$;

-- This function moves money — service role (the webhook) ONLY.
REVOKE ALL ON FUNCTION public.credit_wallet_atomic(uuid, numeric, numeric, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet_atomic(uuid, numeric, numeric, numeric, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.credit_wallet_atomic(uuid, numeric, numeric, numeric, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_atomic(uuid, numeric, numeric, numeric, text, text) TO service_role;

-- Speeds up the per-PI guard (transactions has no index on this column).
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_pi_completed
  ON public.transactions (stripe_payment_intent_id)
  WHERE status = 'completed' AND stripe_payment_intent_id IS NOT NULL;
```

---

## Tests (15 new; suite now 53/53)

- `planLivePurchaseKeys (BUG 1)` — 5: store real PI; lookup order `[pi, session]`; expanded-object PI; session-only fallback; dedupe/empty.
- `soldOutOutcome (BUG 2)` — 5: reserved→credit+confirm; sold-out→no credit; sold-out→honest notify; sold-out→refund+admin; already-refunded→no double refund.
- `atomic wallet credit contract (BUG 3)` — 8: guard skips duplicate PI; credits fresh PI; null PI bypasses guard; net math at $100/$33.33/$19.99 (exact: 95 / 31.66 / 18.99, fee 5 / 1.67 / 1.00); missing-RPC detection (PGRST202, 42883); ordinary errors not misclassified.
- Regression: pre-existing `classifyPurchaseType` suite (8 tests) proves purchase-type routing is byte-identical; all other pre-existing tests (fulfillment, clawback math, refund ids, dispute planning) untouched and green.

## Notes for the coordinator

1. **Deploy order:** migration `20260707100000` can land before or after the webhook — the webhook falls back to the legacy credit path (with a structured warning) until the RPC exists. Deploy the migration promptly to close the race window.
2. **Backfill recommendation (not done, per instruction):** rewrite pre-fix completed `live_purchases.stripe_payment_intent_id` values starting `cs_` to their real PIs; until then the dispute branch's session-id fallback covers them at the cost of one Stripe API call per unmatched dispute.
3. `wallets` has no `UNIQUE(user_id)`; the RPC handles it via advisory lock + oldest-row selection. A future additive migration could add the constraint after checking for duplicates.
4. The buyer-facing sold-out copy uses no green and no new brand colors (notifications are plain text).
