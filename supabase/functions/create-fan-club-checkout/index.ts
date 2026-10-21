// Paid fan club checkout. The client never writes subscription status:
//   POST { tier_id }            -> Stripe Checkout (music_fan_club_tiers)
//   POST { club_id }            -> Stripe Checkout (music_fan_clubs)
//   POST { action: "cancel", tier_id | club_id } -> cancel at period end in Stripe
// Rows are created/updated only by stripe-webhook (service role) from the
// Stripe subscription. Free (0-cent) tiers are granted here, server-side.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGIN = /^https:\/\/((www\.)?uply\.tv|[a-z0-9-]+\.vercel\.app|[a-z0-9.-]+\.lovable\.app)$|^https?:\/\/localhost(:\d+)?$/i;

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN.test(o) ? o : "https://uply.tv",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "Payments not configured" }, 500);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = token ? await db.auth.getUser(token) : { data: { user: null } };
  const user = u?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  try {
    // Resolve what is being bought (price always comes from the DB, never the client).
    let kind: "fan_club_tier" | "fan_club";
    let artistId: string, name: string, priceCents: number, currency = "usd", refId: string;
    if (body?.tier_id) {
      const { data: t } = await db.from("music_fan_club_tiers").select("id, artist_id, name, price_cents, currency, is_active").eq("id", body.tier_id).maybeSingle();
      if (!t || !t.is_active) return json({ error: "Tier not found" }, 404);
      kind = "fan_club_tier"; artistId = t.artist_id; name = t.name; priceCents = t.price_cents; currency = t.currency || "usd"; refId = t.id;
    } else if (body?.club_id) {
      const { data: c } = await db.from("music_fan_clubs").select("id, artist_id, name, monthly_price_cents, is_active").eq("id", body.club_id).maybeSingle();
      if (!c || !c.is_active) return json({ error: "Fan club not found" }, 404);
      kind = "fan_club"; artistId = c.artist_id; name = c.name; priceCents = c.monthly_price_cents; refId = c.id;
    } else {
      return json({ error: "tier_id or club_id required" }, 400);
    }

    const table = kind === "fan_club_tier" ? "music_fan_club_subscriptions" : "music_fan_club_memberships";
    const owner = kind === "fan_club_tier" ? { fan_id: user.id, tier_id: refId } : { user_id: user.id, club_id: refId };
    let q = db.from(table).select("id, status, stripe_subscription_id");
    for (const [k, v] of Object.entries(owner)) q = q.eq(k, v);
    const { data: existing } = await q.maybeSingle();

    if (body?.action === "cancel") {
      if (!existing?.stripe_subscription_id) return json({ error: "No paid subscription" }, 404);
      await stripe.subscriptions.update(existing.stripe_subscription_id, { cancel_at_period_end: true });
      return json({ canceled_at_period_end: true });
    }

    if (existing?.status === "active") return json({ already_subscribed: true });
    if (artistId === user.id) return json({ error: "You can't subscribe to your own fan club" }, 400);

    if (!priceCents || priceCents <= 0) {
      // Free tier: grant server-side, no payment involved.
      await db.from(table).upsert({ ...owner, ...(kind === "fan_club_tier" ? { artist_id: artistId } : {}), status: "active", current_period_end: null },
        { onConflict: kind === "fan_club_tier" ? "fan_id,tier_id" : "club_id,user_id" });
      return json({ free: true });
    }

    const metadata: Record<string, string> = {
      purchase_type: kind, fan_id: user.id, artist_id: artistId,
      ...(kind === "fan_club_tier" ? { tier_id: refId } : { club_id: refId }),
    };

    const { data: acct } = await db.from("creator_stripe_accounts").select("stripe_account_id, charges_enabled").eq("creator_id", artistId).maybeSingle();
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const origin = ALLOWED_ORIGIN.test(req.headers.get("origin") ?? "") ? req.headers.get("origin")! : "https://uply.tv";
    const returnPath = typeof body.return_path === "string" && body.return_path.startsWith("/") && !body.return_path.startsWith("//") ? body.return_path : "/";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customers.data[0]?.id,
      customer_email: customers.data[0] ? undefined : user.email!,
      client_reference_id: user.id,
      line_items: [{
        quantity: 1,
        price_data: { currency, unit_amount: priceCents, recurring: { interval: "month" }, product_data: { name: `Fan club: ${name}` } },
      }],
      metadata,
      subscription_data: {
        metadata,
        ...(acct?.stripe_account_id && acct.charges_enabled
          ? { application_fee_percent: 5, transfer_data: { destination: acct.stripe_account_id } }
          : {}),
      },
      success_url: `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}fan_club=success`,
      cancel_url: `${origin}${returnPath}`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("[create-fan-club-checkout]", (e as Error)?.message ?? e);
    return json({ error: "Checkout failed" }, 500);
  }
});
