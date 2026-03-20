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

          const { data: creatorWallet } = await supabase
            .from("wallets").select("id, available_balance, lifetime_earned").eq("user_id", creator_id).maybeSingle();
          if (creatorWallet) {
            await supabase.from("transactions").insert({
              wallet_id: creatorWallet.id,
              amount,
              net_amount: amount - fee,
              platform_fee_amount: fee,
              type: "earn",
              status: "completed",
              stripe_payment_intent_id: session.payment_intent as string,
              description: `Product sale: ${productName}`,
              completed_at: new Date().toISOString(),
            });

            await supabase.from("wallets").update({
              available_balance: (creatorWallet.available_balance || 0) + (amount - fee),
              lifetime_earned: (creatorWallet.lifetime_earned || 0) + (amount - fee),
            }).eq("id", creatorWallet.id);
          }
          logStep("Product purchase processed with notifications", { buyer_id, product_id, amount });

        } else if (purchaseType === "event_ticket") {
          const { event_id, buyer_id, creator_id } = metadata;
          const amount = (session.amount_total || 0) / 100;
          const fee = Math.round(amount * 0.05 * 100) / 100;
          const token = crypto.randomUUID();

          await supabase.from("tickets").insert({
            event_id,
            buyer_id,
            creator_id,
            stripe_payment_intent_id: session.payment_intent as string,
            amount_paid: amount,
            platform_fee: fee,
            creator_earnings: amount - fee,
            qr_code_token: token,
            status: "active",
          });

          // Increment tickets_sold
          const { data: evt } = await supabase.from("events").select("tickets_sold, ticket_quantity, title").eq("id", event_id).single();
          if (evt) {
            const newSold = (evt.tickets_sold || 0) + 1;
            const isSoldOut = evt.ticket_quantity ? newSold >= evt.ticket_quantity : false;
            await supabase.from("events").update({ tickets_sold: newSold, is_sold_out: isSoldOut }).eq("id", event_id);
          }

          // Wallet update for creator
          const { data: creatorWallet } = await supabase
            .from("wallets").select("id, available_balance, lifetime_earned").eq("user_id", creator_id).maybeSingle();
          if (creatorWallet) {
            await supabase.from("transactions").insert({
              wallet_id: creatorWallet.id,
              amount,
              net_amount: amount - fee,
              platform_fee_amount: fee,
              type: "earn",
              status: "completed",
              stripe_payment_intent_id: session.payment_intent as string,
              description: `Event ticket: ${evt?.title || "Event"}`,
              completed_at: new Date().toISOString(),
            });
            await supabase.from("wallets").update({
              available_balance: (creatorWallet.available_balance || 0) + (amount - fee),
              lifetime_earned: (creatorWallet.lifetime_earned || 0) + (amount - fee),
            }).eq("id", creatorWallet.id);
          }

          // Notify buyer
          const { data: buyerProfile } = await supabase.from("profiles").select("display_name").eq("user_id", buyer_id).maybeSingle();
          await supabase.from("notifications").insert({
            user_id: buyer_id,
            type: "event_ticket",
            title: "Ticket Confirmed! 🎟️",
            message: `Your ticket for "${evt?.title}" is confirmed.`,
            link: `/tickets/${token}`,
          });

          // Notify creator
          await supabase.from("notifications").insert({
            user_id: creator_id,
            type: "event_ticket_sale",
            title: "New Ticket Sale! 🎉",
            message: `${buyerProfile?.display_name || "Someone"} bought a ticket to "${evt?.title}" — $${amount.toFixed(2)}`,
            actor_id: buyer_id,
            link: "/events",
          });

          logStep("Event ticket processed", { event_id, buyer_id, amount });

        } else if (purchaseType === "credits") {
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

            // Get subscriber info for notification email
            const { data: subscriberProfile } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("user_id", member_id)
              .maybeSingle();
            const subscriberName = subscriberProfile?.display_name || subscriberProfile?.username || "Someone";

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

            // Send email notification to creator about new subscriber
            try {
              const { data: { user: creatorAuth } } = await supabase.auth.admin.getUserById(creator_id);
              if (creatorAuth?.email) {
                // Check if creator wants member_joined emails
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