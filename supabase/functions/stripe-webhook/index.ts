import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Missing Stripe configuration" }), { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400, headers: corsHeaders });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: err.message });
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders });
  }

  logStep("Event received", { type: event.type, id: event.id });

  // Idempotency check
  const { data: existingLog } = await supabase
    .from("stripe_webhook_log")
    .select("id, status, attempts")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingLog?.status === "processed") {
    logStep("Event already processed, skipping", { id: event.id });
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  }

  const { data: logEntry } = await supabase
    .from("stripe_webhook_log")
    .upsert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: JSON.parse(body),
      status: "pending",
      attempts: ((existingLog as any)?.attempts || 0) + 1,
      last_attempted_at: new Date().toISOString(),
    }, { onConflict: "stripe_event_id" })
    .select("id")
    .maybeSingle();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const purchaseType = metadata.purchase_type || "subscription";

        if (purchaseType === "tip") {
          // Handle tip
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

          // Record transaction
          const { data: creatorWallet } = await supabase
            .from("wallets").select("id").eq("user_id", creator_id).maybeSingle();
          if (creatorWallet) {
            await supabase.from("transactions").insert({
              wallet_id: creatorWallet.id,
              amount: tipAmount,
              net_amount: tipAmount - fee,
              platform_fee_amount: fee,
              type: "tip",
              status: "completed",
              stripe_payment_intent_id: session.payment_intent as string,
              description: `Tip from viewer`,
              completed_at: new Date().toISOString(),
            });
          }
          logStep("Tip processed", { sender_id, creator_id, amount: tipAmount });

        } else if (purchaseType === "product") {
          // Handle product purchase
          const { buyer_id, product_id, creator_id } = metadata;
          const amount = (session.amount_total || 0) / 100;
          const fee = Math.round(amount * 0.05 * 100) / 100;

          await supabase.from("product_purchases").insert({
            product_id,
            buyer_id,
            creator_id,
            stripe_payment_intent_id: session.payment_intent as string,
            amount,
          });

          // Update product sales count
          await supabase.rpc("increment_product_sales" as any, { p_id: product_id }).catch(() => {
            // Fallback: manual increment
          });

          const { data: creatorWallet } = await supabase
            .from("wallets").select("id").eq("user_id", creator_id).maybeSingle();
          if (creatorWallet) {
            await supabase.from("transactions").insert({
              wallet_id: creatorWallet.id,
              amount,
              net_amount: amount - fee,
              platform_fee_amount: fee,
              type: "earn",
              status: "completed",
              stripe_payment_intent_id: session.payment_intent as string,
              description: "Product sale",
              completed_at: new Date().toISOString(),
            });
          }
          logStep("Product purchase processed", { buyer_id, product_id });

        } else if (purchaseType === "credits") {
          // Handle credit purchase
          const { buyer_id } = metadata;
          // Get the credit package info from line items
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          
          if (priceId) {
            const { data: pkg } = await supabase
              .from("credit_packages")
              .select("credits")
              .eq("stripe_price_id", priceId)
              .maybeSingle();
            
            if (pkg && buyer_id) {
              // Add credits to wallet
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

        } else {
          // Default: subscription checkout
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
            }, { onConflict: "user_id,creator_id" });

            const amount = (session.amount_total || 0) / 100;
            const fee = Math.round(amount * 0.05 * 100) / 100;

            const { data: creatorWallet } = await supabase
              .from("wallets").select("id").eq("user_id", creator_id).maybeSingle();
            if (creatorWallet) {
              await supabase.from("transactions").insert({
                wallet_id: creatorWallet.id,
                amount,
                net_amount: amount - fee,
                platform_fee_amount: fee,
                type: "subscription",
                status: "completed",
                stripe_payment_intent_id: session.payment_intent as string,
                description: "Subscription payment from member",
                completed_at: new Date().toISOString(),
              });
            }
            logStep("Subscription checkout completed", { member_id, creator_id });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("member_subscriptions")
          .update({
            status: sub.status === "active" ? "active" : sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        logStep("Subscription updated", { id: sub.id, status: sub.status });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("member_subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);
        logStep("Subscription canceled", { id: sub.id });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === "subscription_cycle") {
          const amount = (invoice.amount_paid || 0) / 100;
          const fee = Math.round(amount * 0.05 * 100) / 100;
          // Find the subscription to get creator_id
          const { data: memberSub } = await supabase
            .from("member_subscriptions")
            .select("creator_id")
            .eq("stripe_subscription_id", invoice.subscription as string)
            .maybeSingle();
          
          let walletId: string | undefined;
          if (memberSub?.creator_id) {
            const { data: w } = await supabase.from("wallets").select("id").eq("user_id", memberSub.creator_id).maybeSingle();
            walletId = w?.id;
          }

          await supabase.from("transactions").insert({
            wallet_id: walletId || null,
            amount,
            net_amount: amount - fee,
            platform_fee_amount: fee,
            type: "subscription_renewal",
            status: "completed",
            stripe_payment_intent_id: invoice.payment_intent as string,
            description: "Subscription renewal",
            completed_at: new Date().toISOString(),
          });
          logStep("Invoice paid", { id: invoice.id, amount });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          await supabase
            .from("member_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);
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

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    if (logEntry?.id) {
      await supabase
        .from("stripe_webhook_log")
        .update({ status: "processed", error_message: null })
        .eq("id", logEntry.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    logStep("Error processing event", { error: error.message });
    if (logEntry?.id) {
      await supabase
        .from("stripe_webhook_log")
        .update({ status: "failed", error_message: error.message || "Unknown error" })
        .eq("id", logEntry.id);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
