import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  classifyPurchaseType,
  shouldCreateFulfillment,
  computeRefundWalletAdjustment,
  extractRefundIdentifier,
  planDisputeActions,
  planLivePurchaseKeys,
  soldOutOutcome,
  extractPaymentIntentId,
  buildWalletCreditRpcArgs,
  isMissingRpcError,
} from "../_shared/stripeWebhookLogic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

function buildNewSubscriberEmailHtml(subscriberName: string, tierName: string, amount: number): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;">
    <div style="height:4px;background-color:#00FF85;"></div>
    <div style="padding:32px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:40px;margin-bottom:8px;">🎉</div>
        <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0 0 8px;">New Subscriber!</h1>
        <p style="color:#888888;font-size:14px;margin:0;">Your community is growing.</p>
      </div>
      <div style="background:#111111;border:1px solid #1E1E1E;border-radius:12px;padding:20px;margin:20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#888888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;">Member</td>
            <td style="color:#888888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;text-align:right;">Amount</td>
          </tr>
          <tr>
            <td style="color:#FFFFFF;font-size:16px;font-weight:600;">${subscriberName}</td>
            <td style="color:#00FF85;font-size:16px;font-weight:700;text-align:right;">$${amount.toFixed(2)}/mo</td>
          </tr>
          ${tierName ? `<tr><td colspan="2" style="color:#888888;font-size:13px;padding-top:8px;">Tier: ${tierName}</td></tr>` : ''}
        </table>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://uply.tv/dashboard" style="display:inline-block;background-color:#00FF85;color:#0A0A0A;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">View Dashboard →</a>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #1E1E1E;text-align:center;">
      <p style="color:#555;font-size:11px;margin:0;">Powered by UPLY</p>
    </div>
  </div>
</body>
</html>`;
}

// BUG 3 FIX: the wallet credit is now a single-statement atomic increment via
// the SECURITY DEFINER RPC credit_wallet_atomic (migration 20260707100000).
// The RPC replicates the exact semantics below (per-PI idempotency guard,
// same transactions row shape, wallet resolution) but does guard + insert +
// increment in ONE database transaction, so concurrent webhook deliveries
// for the same creator can never lose a credit to a read-then-write race.
// Signature unchanged — all call sites are untouched. If the RPC is missing
// (migration not yet applied mid-deploy), we fall back to the legacy path.
async function updateWallet(supabase: any, creatorId: string, amount: number, fee: number, description: string, paymentIntentId: string | null) {
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "credit_wallet_atomic",
    buildWalletCreditRpcArgs({ creatorId, amount, fee, description, paymentIntentId }),
  );

  if (!rpcError) {
    if (rpcResult && rpcResult.credited === false) {
      logStep("Wallet update skipped (already credited)", { paymentIntentId });
    }
    return;
  }

  if (isMissingRpcError(rpcError, "credit_wallet_atomic")) {
    logStep("WARN credit_wallet_atomic missing — legacy read-then-write fallback", {
      migration: "20260707100000_atomic_wallet_credit.sql",
      paymentIntentId,
      error: rpcError?.message,
    });
  } else {
    // Unknown RPC failure: nothing was applied (the RPC is transactional), so
    // the legacy path below is safe — its per-PI guard re-checks first and a
    // credit that DID land would short-circuit it.
    logStep("WARN credit_wallet_atomic failed — legacy read-then-write fallback", {
      paymentIntentId,
      code: rpcError?.code,
      error: rpcError?.message,
    });
  }

  await legacyReadThenWriteCredit(supabase, creatorId, amount, fee, description, paymentIntentId);
}

// LEGACY PATH — byte-for-byte the pre-fix updateWallet body. Only used when
// the credit_wallet_atomic RPC is unavailable. Known (accepted) limitation:
// read-then-write, so it keeps today's behavior including the race the RPC
// eliminates. Do not extend.
async function legacyReadThenWriteCredit(supabase: any, creatorId: string, amount: number, fee: number, description: string, paymentIntentId: string | null) {
  // Guard: skip if already credited for this payment intent (idempotency)
  if (paymentIntentId) {
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("status", "completed")
      .maybeSingle();
    if (existingTx) {
      logStep("Wallet update skipped (already credited)", { paymentIntentId });
      return;
    }
  }

  const { data: creatorWallet } = await supabase
    .from("wallets").select("id, available_balance, lifetime_earned").eq("user_id", creatorId).maybeSingle();
  if (creatorWallet) {
    await supabase.from("transactions").insert({
      wallet_id: creatorWallet.id,
      amount,
      net_amount: amount - fee,
      platform_fee_amount: fee,
      type: "earn",
      status: "completed",
      stripe_payment_intent_id: paymentIntentId,
      description,
      completed_at: new Date().toISOString(),
    });
    await supabase.from("wallets").update({
      available_balance: (creatorWallet.available_balance || 0) + (amount - fee),
      lifetime_earned: (creatorWallet.lifetime_earned || 0) + (amount - fee),
    }).eq("id", creatorWallet.id);
  }
}

// Stripe signature tolerance window (seconds) — rejects replayed events older than this
const SIGNATURE_TOLERANCE_SECONDS = 300;
// Stale "processing" lock window — if a prior attempt has been processing longer than this,
// we assume it crashed and allow a re-attempt.
const PROCESSING_LOCK_STALE_MS = 60_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("Missing Stripe configuration");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Read raw body for signature verification — never JSON.parse before verifying.
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    logStep("Missing stripe-signature header");
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use async variant — required for Deno (WebCrypto-backed HMAC verification).
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      webhookSecret,
      SIGNATURE_TOLERANCE_SECONDS,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err: any) {
    // Includes invalid signature, malformed header, OR timestamp outside tolerance (replay protection).
    logStep("Signature verification failed", { error: err?.message });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  logStep("Event received", { type: event.type, id: event.id });

  // --- Atomic idempotency claim ---
  // 1) Try to INSERT a fresh log row. The UNIQUE constraint on stripe_event_id
  //    guarantees only one webhook invocation wins the race.
  // 2) If insert succeeds → we own the lock and proceed.
  // 3) If insert fails (duplicate) → another invocation already handled or is handling it.
  let logEntryId: string | null = null;
  const nowIso = new Date().toISOString();
  const { data: inserted, error: insertErr } = await supabase
    .from("stripe_webhook_log")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      status: "processing",
      attempts: 1,
      last_attempted_at: nowIso,
    })
    .select("id")
    .maybeSingle();

  if (inserted?.id) {
    logEntryId = inserted.id;
  } else {
    // Either a duplicate (race) or a true failure
    const { data: existing } = await supabase
      .from("stripe_webhook_log")
      .select("id, status, attempts, last_attempted_at")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (!existing) {
      logStep("Failed to claim webhook log row", { error: insertErr?.message });
      // Return 500 so Stripe retries
      return new Response(JSON.stringify({ error: "Could not record event" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing.status === "processed") {
      logStep("Event already processed, skipping", { id: event.id });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // status is 'pending', 'processing', or 'failed'.
    // If another worker is actively processing (recent lock), ack so Stripe doesn't pile retries.
    const lastAt = existing.last_attempted_at ? new Date(existing.last_attempted_at).getTime() : 0;
    const lockFresh = existing.status === "processing" && Date.now() - lastAt < PROCESSING_LOCK_STALE_MS;
    if (lockFresh) {
      logStep("Event currently being processed by another worker, acking", { id: event.id });
      return new Response(JSON.stringify({ received: true, inflight: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stale lock or prior failure → re-claim this attempt
    const { data: reclaimed } = await supabase
      .from("stripe_webhook_log")
      .update({
        status: "processing",
        attempts: (existing.attempts || 0) + 1,
        last_attempted_at: nowIso,
        error_message: null,
      })
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();
    logEntryId = reclaimed?.id ?? existing.id;
    logStep("Re-claiming previously-failed/stale event", { id: event.id, attempts: (existing.attempts || 0) + 1 });
  }

  const logEntry = { id: logEntryId } as { id: string | null };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const purchaseType = metadata.purchase_type || "subscription";
        // Branch routing extracted to pure logic (tested in src/test/stripe-webhook-logic.test.ts)
        const branch = classifyPurchaseType(metadata);

        if (branch === "track") {
          // Locked-track one-time unlock. Mirrors the product/course branch.
          const { buyer_id, track_id, creator_id } = metadata;
          const amount = (session.amount_total || 0) / 100;
          const fee = Math.round(amount * 0.05 * 100) / 100;
          const pi = session.payment_intent as string;

          if (buyer_id && track_id) {
            await supabase.from("access_grants").insert({
              user_id: buyer_id,
              resource_type: "track",
              resource_id: track_id,
              access_level: "full",
              source: "checkout",
              stripe_payment_intent_id: pi,
              stripe_customer_id: session.customer as string,
              metadata: { purchase_type: "track", creator_id },
            }).then(({ error: agErr }) => {
              if (agErr && !agErr.message?.includes("duplicate") && !agErr.message?.includes("unique")) {
                console.error("access_grants track insert error:", agErr);
              }
            });

            // Best-effort purchase log (table may not exist in all envs)
            await supabase.from("track_purchases").insert({
              track_id,
              buyer_id,
              creator_id,
              amount_cents: session.amount_total || 0,
              stripe_session_id: session.id,
              stripe_payment_intent_id: pi,
            }).then(({ error }) => {
              if (error && !error.message?.includes("duplicate")) {
                console.warn("track_purchases insert skipped:", error.message);
              }
            });

            if (creator_id) {
              await updateWallet(supabase, creator_id, amount, fee, "Track unlock", pi);
            }
            logStep("Track unlock processed", { buyer_id, track_id, amount });
          } else {
            console.error("track purchase missing buyer_id or track_id", metadata);
          }

        } else if (branch === "tip") {
          const { sender_id, creator_id, stream_id, message, amount } = metadata;
          const tipAmount = parseFloat(amount || "0");
          const fee = Math.round(tipAmount * 0.05 * 100) / 100;

          await supabase.from("tip_transactions").insert({
            sender_id,
            receiver_id: creator_id,
            stream_id: stream_id || null,
            amount: tipAmount,
            message: message || null,
          });

          await updateWallet(supabase, creator_id, tipAmount, fee, "Tip from viewer", session.payment_intent as string);
          logStep("Tip processed", { sender_id, creator_id, amount: tipAmount });

        } else if (branch === "product_course") {
          const { buyer_id, product_id, creator_id } = metadata;
          const amount = (session.amount_total || 0) / 100;
          const fee = Math.round(amount * 0.05 * 100) / 100;

          // ON CONFLICT DO NOTHING for duplicate safety
          await supabase.from("product_purchases").upsert({
            product_id,
            buyer_id,
            creator_id,
            stripe_payment_intent_id: session.payment_intent as string,
            amount,
            status: "completed",
          }, { onConflict: "product_id,buyer_id", ignoreDuplicates: true });

          // Write access_grants row
          const resourceType = purchaseType === "course" ? "course" : "product";
          await supabase.from("access_grants").insert({
            user_id: buyer_id,
            resource_type: resourceType,
            resource_id: product_id,
            access_level: "full",
            source: metadata.source || "checkout",
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_customer_id: session.customer as string,
            stream_id: metadata.stream_id || null,
            metadata: { purchase_type: purchaseType },
          }).then(({ error: agErr }) => {
            if (agErr && !agErr.message?.includes("duplicate") && !agErr.message?.includes("unique")) {
              console.error("access_grants insert error:", agErr);
            }
          });

          await supabase.rpc("increment_product_sales" as any, { p_id: product_id, p_amount: amount }).catch(async () => {
            const { data: prod } = await supabase.from("products").select("sales, revenue").eq("id", product_id).maybeSingle();
            if (prod) {
              await supabase.from("products").update({
                sales: (prod.sales || 0) + 1,
                revenue: (prod.revenue || 0) + amount,
              }).eq("id", product_id);
            }
          });

          const { data: purchasedProduct } = await supabase
            .from("products").select("name").eq("id", product_id).maybeSingle();
          const productName = purchasedProduct?.name || "a product";

          const { data: buyerProfile } = await supabase
            .from("profiles").select("display_name, username").eq("user_id", buyer_id).maybeSingle();
          const buyerName = buyerProfile?.display_name || buyerProfile?.username || "Someone";

          await supabase.from("notifications").insert({
            user_id: creator_id,
            type: "sale",
            title: "New Sale! 🎉",
            message: `${buyerName} purchased "${productName}" for $${amount.toFixed(2)}`,
            actor_id: buyer_id,
            reference_id: product_id,
            link: "/dashboard",
          });

          await supabase.from("notifications").insert({
            user_id: buyer_id,
            type: "purchase",
            title: "Purchase Confirmed ✅",
            message: `You purchased "${productName}" for $${amount.toFixed(2)}`,
            actor_id: creator_id,
            reference_id: product_id,
            link: "/products",
          });

          await updateWallet(supabase, creator_id, amount, fee, `Product sale: ${productName}`, session.payment_intent as string);
          logStep("Product/course purchase processed", { buyer_id, product_id, amount });

        } else if (branch === "event_ticket") {
          const { event_id, buyer_id, creator_id } = metadata;
          const qty = parseInt(metadata.quantity || "1", 10) || 1;
          const seatLabels: string[] = (metadata.seat_labels || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
          const amount = (session.amount_total || 0) / 100;
          const fee = Math.round(amount * 0.05 * 100) / 100;
          let firstToken: string | null = null;

          // Atomic reserve to guarantee no oversell under concurrent webhooks
          const { data: reserved } = await supabase.rpc("reserve_event_ticket", { p_event_id: event_id, p_qty: qty });

          if (reserved) {
            const perTicketAmount = amount / qty;
            const perTicketFee = fee / qty;
            for (let i = 0; i < qty; i++) {
              const tk = crypto.randomUUID();
              const secret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
              if (!firstToken) firstToken = tk;
              await supabase.from("tickets").insert({
                event_id,
                buyer_id,
                creator_id,
                stripe_payment_intent_id: session.payment_intent as string,
                amount_paid: perTicketAmount,
                platform_fee: perTicketFee,
                creator_earnings: perTicketAmount - perTicketFee,
                qr_code_token: tk,
                qr_code_secret: secret,
                seat_label: seatLabels[i] ?? null,
                status: "active",
              });
            }
          }

          // BUG 2 FIX: on reservation failure the handler used to FALL THROUGH
          // to the wallet credit and "Ticket Confirmed!" anyway — creator paid
          // for zero tickets, buyer told a lie. Decision matrix is pure/tested
          // (soldOutOutcome); the refund is guarded per payment intent.
          const ticketPi = extractPaymentIntentId(session.payment_intent);
          const soldOutRefundKey = `soldout:${ticketPi || session.id}`;

          let refundAlreadyIssued = false;
          if (!reserved) {
            // Per-PI idempotency claim — same UNIQUE(refund_id) pattern as the
            // charge.refunded clawback guard (migration 20260706180000).
            const { data: refundClaim, error: refundClaimErr } = await supabase
              .from("stripe_refund_clawbacks")
              .insert({
                refund_id: soldOutRefundKey,
                stripe_payment_intent_id: ticketPi,
              })
              .select("id")
              .maybeSingle();
            if (!refundClaim && (refundClaimErr?.code === "23505" || refundClaimErr?.message?.includes("duplicate"))) {
              const { data: existingClaim } = await supabase
                .from("stripe_refund_clawbacks")
                .select("clawback_amount")
                .eq("refund_id", soldOutRefundKey)
                .maybeSingle();
              // Non-NULL applied amount marks a refund that fully went through;
              // NULL means a prior attempt crashed before refunding — retry.
              refundAlreadyIssued = !!existingClaim && existingClaim.clawback_amount !== null;
            }
            // Any other claim failure (e.g. guard table missing): proceed with
            // the refund anyway — the Stripe idempotency key plus
            // charge_already_refunded handling below make it single-shot.
          }

          const outcome = soldOutOutcome({ reserved: !!reserved, refundAlreadyIssued });

          const { data: evt } = await supabase.from("events").select("title").eq("id", event_id).single();

          if (outcome.creditWallet) {
            await updateWallet(supabase, creator_id, amount, fee, `Event ticket: ${evt?.title || "Event"}`, session.payment_intent as string);
          }

          if (outcome.confirmTickets) {
            await supabase.from("notifications").insert({
              user_id: buyer_id,
              type: "event_ticket",
              title: "Ticket Confirmed! 🎟️",
              message: `Your ticket for "${evt?.title}" is confirmed.`,
              link: firstToken ? `/tickets/${firstToken}` : "/wallet",
            });

            const { data: buyerProfile } = await supabase.from("profiles").select("display_name").eq("user_id", buyer_id).maybeSingle();
            await supabase.from("notifications").insert({
              user_id: creator_id,
              type: "event_ticket_sale",
              title: "New Ticket Sale! 🎉",
              message: `${buyerProfile?.display_name || "Someone"} bought a ticket to "${evt?.title}" — $${amount.toFixed(2)}`,
              actor_id: buyer_id,
              link: "/events",
            });

            logStep("Event ticket processed", { event_id, buyer_id, amount });
          } else {
            // ── Sold out: refund the buyer, never credit the creator ──
            let refundSucceeded = refundAlreadyIssued;
            if (outcome.issueRefund && ticketPi) {
              // Wrapped so a refund failure NEVER throws the handler — the
              // event still acks 200 and admins get a manual-refund alert.
              try {
                try {
                  await stripe.refunds.create(
                    { payment_intent: ticketPi },
                    // Stripe-side idempotency: a redelivered event re-requests
                    // the SAME refund instead of creating a second one.
                    { idempotencyKey: `soldout-refund-${ticketPi}` },
                  );
                } catch (refundErr: any) {
                  if (refundErr?.code !== "charge_already_refunded") throw refundErr;
                }
                refundSucceeded = true;
                // Record the applied amount on the guard row (non-NULL = done)
                await supabase.from("stripe_refund_clawbacks")
                  .update({ clawback_amount: amount, wallet_decrement: 0, shortfall: 0 })
                  .eq("refund_id", soldOutRefundKey);
                logStep("Sold-out refund issued", { event_id, buyer_id, paymentIntent: ticketPi, amount });
              } catch (refundErr: any) {
                logStep("Sold-out refund FAILED — manual refund required", {
                  event_id, buyer_id, paymentIntent: ticketPi, amount, error: refundErr?.message,
                });
              }
            } else if (outcome.issueRefund && !ticketPi) {
              logStep("Sold-out refund impossible — session has no payment intent", { event_id, buyer_id, sessionId: session.id });
            }

            // Honest buyer notification — never "Ticket Confirmed!"
            await supabase.from("notifications").insert({
              user_id: buyer_id,
              type: "event_ticket",
              title: refundSucceeded ? "Event Sold Out — Payment Refunded" : "Event Sold Out",
              message: refundSucceeded
                ? `"${evt?.title || "The event"}" sold out before your payment completed. Your payment has been refunded in full.`
                : `"${evt?.title || "The event"}" sold out before your payment completed. Your refund is being processed — contact support if it doesn't arrive within 5-10 business days.`,
              link: "/wallet",
            });

            // Admin visibility — same notify_admin batching/dedup pattern as
            // the charge.dispute.created branch.
            const { error: soldOutAdminErr } = await supabase.rpc("notify_admin", {
              p_title: refundSucceeded ? "Sold-out ticket auto-refunded" : "🚨 Sold-out refund FAILED — refund manually",
              p_body: `Event ${evt?.title || event_id} oversold: buyer ${buyer_id} paid $${amount.toFixed(2)} (PI ${ticketPi || "unknown"}) after capacity ran out. ` +
                (refundSucceeded ? "Refund issued automatically; no wallet credit was made." : "Automatic refund FAILED — issue it manually in Stripe. No wallet credit was made."),
              p_type: "sold_out_refund",
              p_link: "/admin",
              p_metadata: { event_id, buyer_id, payment_intent: ticketPi, session_id: session.id, refunded: refundSucceeded },
              p_amount: amount,
              p_dedup_key: soldOutRefundKey,
            });
            if (soldOutAdminErr) {
              logStep("notify_admin failed (non-fatal)", { error: soldOutAdminErr.message });
            }

            logStep("Event ticket sold out — buyer refunded, creator NOT credited", {
              event_id, buyer_id, amount, refunded: refundSucceeded,
            });
          }

        } else if (branch === "credits") {
          const { buyer_id } = metadata;
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          
          if (priceId) {
            const { data: pkg } = await supabase
              .from("credit_packages")
              .select("credits")
              .eq("stripe_price_id", priceId)
              .maybeSingle();
            
            if (pkg && buyer_id) {
              const { data: wallet } = await supabase
                .from("wallets").select("id, credits").eq("user_id", buyer_id).maybeSingle();
              if (wallet) {
                await supabase.from("wallets").update({
                  credits: (wallet.credits || 0) + pkg.credits,
                }).eq("id", wallet.id);
              }
              logStep("Credits added", { buyer_id, credits: pkg.credits });
            }
          }

        } else if (branch === "subscription") {
          // Subscription checkout
          const { member_id, creator_id, tier_id, space_id } = metadata;
          if (member_id && creator_id) {
            // ON CONFLICT DO UPDATE for subscriptions
            await supabase.from("member_subscriptions").upsert({
              member_id,
              creator_id,
              tier_id: tier_id || null,
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              status: "active",
              current_period_start: new Date().toISOString(),
            }, { onConflict: "member_id,creator_id" });

            // ON CONFLICT DO NOTHING for community_members
            await supabase.from("community_members").upsert({
              user_id: member_id,
              creator_id,
            }, { onConflict: "creator_id,user_id" });

            // Auto-capture subscriber email from membership
            try {
              const { data: memberAuth } = await supabase.auth.admin.getUserById(member_id);
              if (memberAuth?.user?.email) {
                const { data: memberProfile } = await supabase
                  .from("profiles").select("display_name").eq("user_id", member_id).maybeSingle();
                await supabase.from("subscribers").upsert({
                  creator_id,
                  email: memberAuth.user.email,
                  name: memberProfile?.display_name || null,
                  source: "membership",
                  metadata: { tier_id, subscription_id: session.subscription },
                }, { onConflict: "creator_id,email" });
              }
            } catch (subErr) {
              console.warn("Subscriber capture from membership failed:", subErr);
            }

            // Write access_grants for community + tier
            const subId = session.subscription as string;
            const custId = session.customer as string;

            // Community access grant
            if (space_id) {
              await supabase.from("access_grants").insert({
                user_id: member_id,
                resource_type: "community",
                resource_id: space_id,
                access_level: "full",
                source: "checkout",
                stripe_subscription_id: subId,
                stripe_customer_id: custId,
                metadata: { tier_id, creator_id },
              }).then(({ error: agErr }) => {
                if (agErr && !agErr.message?.includes("duplicate") && !agErr.message?.includes("unique")) {
                  console.error("access_grants community insert error:", agErr);
                }
              });
            }

            // Membership tier access grant
            if (tier_id) {
              await supabase.from("access_grants").insert({
                user_id: member_id,
                resource_type: "membership_tier",
                resource_id: tier_id,
                access_level: "full",
                source: "checkout",
                stripe_subscription_id: subId,
                stripe_customer_id: custId,
                metadata: { space_id, creator_id },
              }).then(({ error: agErr }) => {
                if (agErr && !agErr.message?.includes("duplicate") && !agErr.message?.includes("unique")) {
                  console.error("access_grants tier insert error:", agErr);
                }
              });
            }

            const amount = (session.amount_total || 0) / 100;
            const fee = Math.round(amount * 0.05 * 100) / 100;

            await updateWallet(supabase, creator_id, amount, fee, "Subscription payment", session.payment_intent as string);

            // Get subscriber info for notification email
            const { data: subscriberProfile } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("user_id", member_id)
              .maybeSingle();
            const subscriberName = subscriberProfile?.display_name || subscriberProfile?.username || "Someone";

            // Notify member
            await supabase.from("notifications").insert({
              user_id: member_id,
              type: "subscription_confirmed",
              title: "Welcome! 🎉",
              message: "Your subscription is active. Enjoy full access!",
              link: `/community/${creator_id}/community`,
            });

            // Notify creator
            await supabase.from("notifications").insert({
              user_id: creator_id,
              type: "new_subscriber",
              title: "New Subscriber! 🎉",
              message: `${subscriberName} just subscribed to your community`,
              actor_id: member_id,
              link: "/dashboard",
            });

            // Get tier name if available
            let tierName = "";
            if (tier_id) {
              const { data: tier } = await supabase
                .from("subscription_tiers")
                .select("name")
                .eq("id", tier_id)
                .maybeSingle();
              tierName = tier?.name || "";
            }

            // Send email notification to creator
            try {
              const { data: { user: creatorAuth } } = await supabase.auth.admin.getUserById(creator_id);
              if (creatorAuth?.email) {
                const { data: emailPref } = await supabase
                  .from("notification_preferences")
                  .select("member_joined_email")
                  .eq("user_id", creator_id)
                  .maybeSingle();

                const wantsEmail = emailPref?.member_joined_email !== false;

                if (wantsEmail) {
                  const emailHtml = buildNewSubscriberEmailHtml(subscriberName, tierName, amount);
                  const messageId = `new-subscriber-${member_id}-${crypto.randomUUID().slice(0, 8)}`;

                  await supabase.from("email_send_log").insert({
                    message_id: messageId,
                    template_name: "new_subscriber",
                    recipient_email: creatorAuth.email,
                    status: "pending",
                  });

                  await supabase.rpc("enqueue_email", {
                    queue_name: "transactional_emails",
                    payload: {
                      run_id: crypto.randomUUID(),
                      to: creatorAuth.email,
                      from: "UPLY <noreply@notify.uply.tv>",
                      sender_domain: "notify.uply.tv",
                      subject: `🎉 New subscriber: ${subscriberName} joined your community!`,
                      html: emailHtml,
                      text: `${subscriberName} just subscribed to your community${tierName ? ` (${tierName} tier)` : ''} for $${amount.toFixed(2)}/mo. View your dashboard: https://uply.tv/dashboard`,
                      purpose: "transactional",
                      label: "new_subscriber",
                      message_id: messageId,
                      idempotency_key: messageId,
                      queued_at: new Date().toISOString(),
                    },
                  });

                  logStep("New subscriber email enqueued", { creator_id, subscriber: subscriberName });
                }
              }
            } catch (emailErr) {
              console.error("Failed to send new subscriber email:", emailErr);
            }

            logStep("Subscription checkout completed", { member_id, creator_id });
          }
        } else if (branch === "live_product") {
          const { live_product_id, buyer_id, creator_id } = metadata;
          if (!live_product_id || !buyer_id || !creator_id) {
            logStep("Missing live_product metadata", metadata);
            break;
          }

          // BUG 1 FIX: pending rows are created by stripe-create-live-purchase
          // with the checkout SESSION id in stripe_payment_intent_id (the real
          // PI doesn't exist at insert time). Completion now locates the row
          // via dual lookup (real PI first, legacy session id fallback — so
          // existing rows keep working) and stores the REAL payment intent, so
          // refund/dispute paths that look up by PI can find live purchases.
          const lpKeys = planLivePurchaseKeys({
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
          });

          let purchase: { id: string } | null = null;
          for (const lookupKey of lpKeys.lookupOrder) {
            const { data: foundPurchase } = await supabase
              .from("live_purchases")
              .select("id")
              .eq("stripe_payment_intent_id", lookupKey)
              .eq("live_product_id", live_product_id)
              .maybeSingle();
            if (foundPurchase) { purchase = foundPurchase; break; }
          }

          // Mark purchase completed + upgrade the key to the real payment intent
          if (purchase) {
            await supabase.from("live_purchases")
              .update({ status: "completed", stripe_payment_intent_id: lpKeys.storeId })
              .eq("id", purchase.id);
          } else {
            logStep("live_purchases row not found for completion", {
              live_product_id, session_id: session.id, payment_intent: lpKeys.storeId,
            });
          }

          if (purchase) {
            // Save shipping address if collected by Stripe
            if ((session as any).shipping_details?.address) {
              const addr = (session as any).shipping_details.address;
              await supabase.from("live_purchase_addresses").insert({
                purchase_id: purchase.id,
                buyer_id,
                full_name: (session as any).shipping_details.name || "Buyer",
                address_line1: addr.line1 || "",
                address_line2: addr.line2 || null,
                city: addr.city || "",
                state: addr.state || "",
                zip: addr.postal_code || "",
                country: addr.country || "US",
              });
            }

            // Auto-create unfulfilled fulfillment record — except for PPV
            // access purchases (digital entitlement, nothing to ship). Keeps
            // creator fulfillment queues clean.
            const { data: lpTypeRow } = await supabase
              .from("live_products").select("type").eq("id", live_product_id).maybeSingle();
            if (shouldCreateFulfillment({ liveProductType: lpTypeRow?.type, metadataContext: metadata.context })) {
              await supabase.from("live_purchase_fulfillments").insert({
                purchase_id: purchase.id,
                creator_id,
                status: "unfulfilled",
              });
            } else {
              logStep("Fulfillment skipped (PPV access purchase)", { live_product_id });
            }
          }

          // Credit creator wallet (95% of sale amount)
          const lpAmount = (session.amount_total || 0) / 100;
          const lpFee = Math.round(lpAmount * 0.05 * 100) / 100;
          await updateWallet(supabase, creator_id, lpAmount, lpFee, "Live product sale", session.payment_intent as string);

          // Notify creator of sale
          const { data: lpBuyerProfile } = await supabase.from("profiles").select("display_name").eq("user_id", buyer_id).maybeSingle();
          const { data: liveProduct } = await supabase.from("live_products").select("title").eq("id", live_product_id).maybeSingle();

          await supabase.from("notifications").insert({
            user_id: creator_id,
            type: "live_sale",
            title: "🛍️ Live sale!",
            message: `${lpBuyerProfile?.display_name || "Someone"} bought "${liveProduct?.title || "a product"}" for $${lpAmount.toFixed(2)}`,
            link: "/dashboard",
          });

          logStep("Live product purchase completed", { live_product_id, buyer_id, lpAmount });
        } else {
          // Fallback: treat as subscription for backwards compat
          const { member_id, creator_id, tier_id } = metadata;
          if (member_id && creator_id) {
            await supabase.from("member_subscriptions").upsert({
              member_id,
              creator_id,
              tier_id: tier_id || null,
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              status: "active",
              current_period_start: new Date().toISOString(),
            }, { onConflict: "member_id,creator_id" });

            await supabase.from("community_members").upsert({
              user_id: member_id,
              creator_id,
            }, { onConflict: "creator_id,user_id" });
          }
          logStep("Fallback subscription processed", { member_id, creator_id });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const newStatus = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : sub.status;
        
        const { data: updatedSub } = await supabase
          .from("member_subscriptions")
          .update({
            status: newStatus,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", sub.id)
          .select("member_id, creator_id")
          .maybeSingle();

        // Update access_grants for subscription changes
        if (newStatus === "past_due") {
          // Downgrade to preview access
          await supabase.from("access_grants")
            .update({ access_level: "preview" })
            .eq("stripe_subscription_id", sub.id)
            .is("revoked_at", null);
        } else if (newStatus === "active") {
          // Restore full access and update expiry
          await supabase.from("access_grants")
            .update({
              access_level: "full",
              expires_at: new Date(sub.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", sub.id)
            .is("revoked_at", null);
        }

        // Notify if recovered from past_due
        if (newStatus === "active" && updatedSub) {
          await supabase.from("notifications").insert({
            user_id: updatedSub.member_id,
            type: "subscription_recovered",
            title: "Payment Successful ✅",
            message: "Your payment was successful — welcome back!",
          });
        }

        logStep("Subscription updated", { id: sub.id, status: newStatus });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: canceledSub } = await supabase
          .from("member_subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id)
          .select("member_id, creator_id")
          .maybeSingle();

        if (canceledSub) {
          // Get creator name for notification
          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", canceledSub.creator_id)
            .maybeSingle();
          const creatorName = creatorProfile?.display_name || "a creator";

          const { data: memberProfile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("user_id", canceledSub.member_id)
            .maybeSingle();
          const memberName = memberProfile?.display_name || memberProfile?.username || "A member";

          await supabase.from("notifications").insert({
            user_id: canceledSub.member_id,
            type: "subscription_canceled",
            title: "Subscription Canceled",
            message: `Your subscription to ${creatorName}'s community has been canceled.`,
          });

          await supabase.from("notifications").insert({
            user_id: canceledSub.creator_id,
            type: "member_canceled",
            title: "Member Canceled",
            message: `${memberName} canceled their subscription.`,
            actor_id: canceledSub.member_id,
          });
        }

        // Revoke all access_grants tied to this subscription
        await supabase.from("access_grants")
          .update({ revoked_at: new Date().toISOString(), revoke_reason: "subscription_cancelled" })
          .eq("stripe_subscription_id", sub.id)
          .is("revoked_at", null);

        logStep("Subscription canceled", { id: sub.id });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === "subscription_cycle") {
          const amount = (invoice.amount_paid || 0) / 100;
          const fee = Math.round(amount * 0.05 * 100) / 100;
          const { data: memberSub } = await supabase
            .from("member_subscriptions")
            .select("creator_id, member_id")
            .eq("stripe_subscription_id", invoice.subscription as string)
            .maybeSingle();
          
          if (memberSub?.creator_id) {
            // Update period end
            const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
            await supabase.from("member_subscriptions").update({
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              status: "active",
            }).eq("stripe_subscription_id", invoice.subscription as string);

            await updateWallet(supabase, memberSub.creator_id, amount, fee, "Subscription renewal", invoice.payment_intent as string);

            // Notify creator
            const { data: memberProfile } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("user_id", memberSub.member_id)
              .maybeSingle();
            const memberName = memberProfile?.display_name || memberProfile?.username || "A member";

            await supabase.from("notifications").insert({
              user_id: memberSub.creator_id,
              type: "renewal",
              title: "💰 Renewal",
              message: `${memberName} renewed — you earned $${(amount - fee).toFixed(2)}`,
              actor_id: memberSub.member_id,
            });
          }

          logStep("Invoice paid (renewal)", { id: invoice.id, amount });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          const { data: failedSub } = await supabase
            .from("member_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId)
            .select("member_id, creator_id")
            .maybeSingle();

          if (failedSub) {
            await supabase.from("notifications").insert({
              user_id: failedSub.member_id,
              type: "payment_failed",
              title: "⚠️ Payment Failed",
              message: "Your payment failed — update your payment method to keep access.",
              link: "/settings",
            });

            // Enqueue email
            try {
              const { data: { user: memberAuth } } = await supabase.auth.admin.getUserById(failedSub.member_id);
              if (memberAuth?.email) {
                await supabase.rpc("enqueue_email", {
                  queue_name: "transactional_emails",
                  payload: {
                    run_id: crypto.randomUUID(),
                    to: memberAuth.email,
                    from: "UPLY <noreply@notify.uply.tv>",
                    sender_domain: "notify.uply.tv",
                    subject: "Action required: Update your payment method",
                    html: `<p>Your subscription payment failed. Please update your payment method to keep access to your communities.</p><a href="https://uply.tv/settings">Update Payment →</a>`,
                    text: "Your subscription payment failed. Update your payment method at https://uply.tv/settings",
                    purpose: "transactional",
                    label: "payment_failed",
                    message_id: `pf-${failedSub.member_id}-${crypto.randomUUID().slice(0, 8)}`,
                    queued_at: new Date().toISOString(),
                  },
                });
              }
            } catch (e) {
              console.error("Failed to send payment failed email:", e);
            }
          }

          logStep("Payment failed, marked past_due", { subId });
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await supabase
          .from("creator_stripe_accounts")
          .update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
          })
          .eq("stripe_account_id", account.id);
        logStep("Account updated", { id: account.id, charges: account.charges_enabled });
        break;
      }

      case "transfer.created": {
        const transfer = event.data.object as any;
        logStep("Transfer created", { id: transfer.id, amount: transfer.amount });
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const disputePi = typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : (dispute.payment_intent as any)?.id ?? null;

        // Find the purchase by payment intent across the purchase tables.
        // An unknown PI is NOT an error — log, alert admins, ack 200.
        let dpProductPurchases: Array<{ id: string; creator_id: string | null }> = [];
        let dpTickets: Array<{ id: string; creator_id: string | null }> = [];
        let dpLivePurchases: Array<{ id: string; creator_id: string | null }> = [];
        if (disputePi) {
          const { data: pp } = await supabase
            .from("product_purchases").select("id, creator_id")
            .eq("stripe_payment_intent_id", disputePi);
          const { data: tks } = await supabase
            .from("tickets").select("id, creator_id")
            .eq("stripe_payment_intent_id", disputePi);
          const { data: lps } = await supabase
            .from("live_purchases").select("id, creator_id")
            .eq("stripe_payment_intent_id", disputePi);
          dpProductPurchases = pp || [];
          dpTickets = tks || [];
          dpLivePurchases = lps || [];

          // BUG 1 fallback: live_purchases rows completed BEFORE the PI fix
          // carry the checkout SESSION id in stripe_payment_intent_id. If the
          // real PI matched nothing, resolve its session id from Stripe and
          // retry (best-effort — a lookup failure must never fail the event).
          if (dpLivePurchases.length === 0) {
            try {
              const piSessions = await stripe.checkout.sessions.list({ payment_intent: disputePi, limit: 1 });
              const legacySessionId = piSessions.data?.[0]?.id;
              if (legacySessionId) {
                const { data: legacyLps } = await supabase
                  .from("live_purchases").select("id, creator_id")
                  .eq("stripe_payment_intent_id", legacySessionId);
                dpLivePurchases = legacyLps || [];
              }
            } catch (fallbackErr: any) {
              logStep("Dispute legacy session-id fallback failed (non-fatal)", { error: fallbackErr?.message });
            }
          }
        }

        const plan = planDisputeActions(
          { disputeId: dispute.id, paymentIntentId: disputePi, amountCents: dispute.amount, reason: dispute.reason },
          { productPurchases: dpProductPurchases, tickets: dpTickets, livePurchases: dpLivePurchases },
        );

        // POLICY: do NOT auto-revoke access — chargebacks are contested and may
        // be won. plan.revokeAccess is always false by design. Ticket and
        // live-purchase statuses are also left untouched (they gate scanning /
        // PPV access); those matches surface via the admin alert instead.
        if (plan.productPurchaseIdsToMarkDisputed.length > 0) {
          await supabase.from("product_purchases")
            .update({ status: "disputed" })
            .in("id", plan.productPurchaseIdsToMarkDisputed);
        }

        for (const disputedCreatorId of plan.creatorIdsToNotify) {
          await supabase.from("notifications").insert({
            user_id: disputedCreatorId,
            type: plan.notificationType,
            title: plan.creatorTitle,
            message: plan.creatorMessage,
            reference_id: dispute.id,
            link: "/dashboard",
          });
        }

        // Admin visibility — reuse the notify_admin batching/dedup pattern.
        const { error: disputeAdminErr } = await supabase.rpc("notify_admin", {
          p_title: plan.adminTitle,
          p_body: plan.adminMessage,
          p_type: plan.notificationType,
          p_link: "/admin",
          p_metadata: { dispute_id: dispute.id, payment_intent: disputePi },
          p_amount: (dispute.amount || 0) / 100,
          p_dedup_key: dispute.id,
        });
        if (disputeAdminErr) {
          logStep("notify_admin failed (non-fatal)", { error: disputeAdminErr.message });
        }

        logStep("Dispute recorded", {
          disputeId: dispute.id,
          paymentIntent: disputePi,
          identified: plan.identified,
          markedDisputed: plan.productPurchaseIdsToMarkDisputed.length,
          flaggedWithoutStatusChange: plan.flaggedWithoutStatusChange.length,
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;
        if (paymentIntentId) {
          // Revoke access grants tied to this payment intent
          await supabase.from("access_grants")
            .update({ revoked_at: new Date().toISOString(), revoke_reason: "refunded" })
            .eq("stripe_payment_intent_id", paymentIntentId)
            .is("revoked_at", null);

          logStep("Charge refunded, access revoked", { paymentIntentId });

          // ── Wallet clawback: reverse the previously-credited net (95% share),
          // proportional on partial refunds, floored at zero. ──
          const refundId = extractRefundIdentifier(charge as any);

          // Per-refund idempotency claim — UNIQUE(refund_id) means only one
          // delivery of this refund proceeds. If a prior attempt claimed the
          // row but crashed before applying (clawback_amount still NULL), the
          // retry may proceed; concurrent same-event races are already
          // serialized by the stripe_event_id claim above.
          let proceedWithClawback = false;
          const { data: clawClaim, error: clawClaimErr } = await supabase
            .from("stripe_refund_clawbacks")
            .insert({
              refund_id: refundId,
              stripe_charge_id: charge.id,
              stripe_payment_intent_id: paymentIntentId,
            })
            .select("id")
            .maybeSingle();
          if (clawClaim) {
            proceedWithClawback = true;
          } else if (clawClaimErr?.code === "23505" || clawClaimErr?.message?.includes("duplicate")) {
            const { data: existingClaw } = await supabase
              .from("stripe_refund_clawbacks")
              .select("clawback_amount")
              .eq("refund_id", refundId)
              .maybeSingle();
            if (existingClaw && existingClaw.clawback_amount !== null) {
              logStep("Refund clawback skipped (already applied)", { refundId, paymentIntentId });
            } else {
              proceedWithClawback = true; // prior attempt crashed before applying
            }
          } else {
            // Guard table unavailable (migration not deployed?) — fail safe:
            // keep today's behavior (no clawback) and log loudly.
            logStep("Refund clawback unavailable — guard claim failed", {
              refundId, paymentIntentId, error: clawClaimErr?.message,
            });
          }

          if (proceedWithClawback) {
            // The original wallet credit for this payment (95% net "earn" row)
            const { data: earnTx } = await supabase
              .from("transactions")
              .select("id, wallet_id, net_amount")
              .eq("stripe_payment_intent_id", paymentIntentId)
              .eq("type", "earn")
              .eq("status", "completed")
              .maybeSingle();

            if (!earnTx?.wallet_id || !(Number(earnTx.net_amount) > 0)) {
              logStep("Refund clawback skipped (no prior wallet credit)", { paymentIntentId, refundId });
            } else {
              // Prior clawbacks for this PI (handles successive partial refunds)
              const { data: priorClaws } = await supabase
                .from("stripe_refund_clawbacks")
                .select("clawback_amount")
                .eq("stripe_payment_intent_id", paymentIntentId)
                .neq("refund_id", refundId);
              const alreadyClawedBack = (priorClaws || [])
                .reduce((sum: number, r: any) => sum + (Number(r.clawback_amount) || 0), 0);

              const { data: clawWallet } = await supabase
                .from("wallets")
                .select("id, available_balance")
                .eq("id", earnTx.wallet_id)
                .maybeSingle();

              const adj = computeRefundWalletAdjustment({
                amountCents: charge.amount || 0,
                amountRefundedCents: charge.amount_refunded || 0,
                priorCreditedNet: Number(earnTx.net_amount) || 0,
                alreadyClawedBack,
                walletAvailableBalance: Number(clawWallet?.available_balance) || 0,
              });

              if (adj.clawback <= 0) {
                logStep("Refund clawback no-op (nothing left to claw back)", { paymentIntentId, refundId });
              } else {
                // Ledger row: type "refund", negative net_amount.
                // NOTE: stripe_payment_intent_id intentionally NOT set here —
                // updateWallet's idempotency guard maybeSingle()s completed
                // transactions by PI; a second row with the same PI would break
                // that guard. The refund is keyed by reference_id instead.
                await supabase.from("transactions").insert({
                  wallet_id: earnTx.wallet_id,
                  amount: -adj.clawback,
                  net_amount: -adj.clawback,
                  platform_fee_amount: 0,
                  type: "refund",
                  status: "completed",
                  reference_id: refundId,
                  description: adj.shortfall > 0
                    ? `Refund clawback for ${paymentIntentId} — wallet floored at zero, shortfall $${adj.shortfall.toFixed(2)}`
                    : `Refund clawback for ${paymentIntentId}`,
                  completed_at: new Date().toISOString(),
                });

                if (clawWallet && adj.walletDecrement > 0) {
                  await supabase.from("wallets")
                    .update({ available_balance: adj.newBalance })
                    .eq("id", clawWallet.id);
                }

                // Record the applied amounts on the guard row
                await supabase.from("stripe_refund_clawbacks")
                  .update({
                    wallet_id: earnTx.wallet_id,
                    clawback_amount: adj.clawback,
                    wallet_decrement: adj.walletDecrement,
                    shortfall: adj.shortfall,
                  })
                  .eq("refund_id", refundId);

                if (adj.shortfall > 0) {
                  logStep("Refund clawback SHORTFALL (wallet floored at zero)", {
                    paymentIntentId, refundId,
                    clawback: adj.clawback, recovered: adj.walletDecrement, shortfall: adj.shortfall,
                  });
                }
                logStep("Refund clawback applied", {
                  paymentIntentId, refundId,
                  clawback: adj.clawback, walletDecrement: adj.walletDecrement, newBalance: adj.newBalance,
                });
              }
            }
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    if (logEntry?.id) {
      await supabase
        .from("stripe_webhook_log")
        .update({ status: "processed", error_message: null, last_attempted_at: new Date().toISOString() })
        .eq("id", logEntry.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const errMsg = error?.message || "Unknown error";
    logStep("Error processing event", { id: event.id, type: event.type, error: errMsg });
    if (logEntry?.id) {
      await supabase
        .from("stripe_webhook_log")
        .update({
          status: "failed",
          error_message: errMsg.slice(0, 1000),
          last_attempted_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);
    }
    // Return 500 so Stripe retries with exponential backoff.
    // Do NOT leak internal error details to the response body.
    return new Response(JSON.stringify({ error: "Processing failed", event_id: event.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

