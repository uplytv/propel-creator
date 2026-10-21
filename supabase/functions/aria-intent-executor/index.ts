import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsError || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const creatorId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const actionId = body?.action_id;
    if (!actionId) return json({ error: "action_id required" }, 400);

    const { data: action, error: aErr } = await admin
      .from("aria_actions")
      .select("*")
      .eq("id", actionId)
      .eq("creator_id", creatorId)
      .maybeSingle();
    if (aErr || !action) return json({ error: "Action not found" }, 404);
    if (action.status === "executed") return json({ action });
    if (action.requires_approval && action.status !== "approved") {
      return json({ error: "Action requires approval first" }, 400);
    }

    let result: unknown = null;
    try {
      result = await execute(admin, creatorId, action.intent, action.parsed_params, authHeader);
    } catch (e) {
      const msg = (e as Error).message;
      await admin.from("aria_actions").update({
        status: "failed",
        error: msg,
        executed_at: new Date().toISOString(),
      }).eq("id", actionId);
      return json({ error: msg }, 500);
    }

    const { data: updated } = await admin
      .from("aria_actions")
      .update({
        status: "executed",
        result: result as any,
        executed_at: new Date().toISOString(),
      })
      .eq("id", actionId)
      .select()
      .single();

    return json({ action: updated });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}));

async function execute(
  admin: any,
  creatorId: string,
  intent: string,
  params: any,
  authHeader: string,
) {
  switch (intent) {
    case "members.list": {
      const limit = Math.min(Number(params?.limit ?? 10), 100);
      const sort = params?.sort ?? "joined";
      if (sort === "ltv") {
        // Top members by sum(price_monthly * months_active) approximation via active subs
        const { data, error } = await admin
          .from("member_subscriptions")
          .select("member_id, status, created_at, current_period_end, tier:subscription_tiers(name, price_monthly)")
          .eq("creator_id", creatorId)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(limit);
        if (error) throw error;
        const enriched = (data ?? []).map((r: any) => {
          const months = Math.max(
            1,
            Math.floor(
              (Date.now() - new Date(r.created_at).getTime()) /
                (1000 * 60 * 60 * 24 * 30),
            ),
          );
          const ltv = Number(r.tier?.price_monthly ?? 0) * months;
          return { member_id: r.member_id, tier: r.tier?.name, months, ltv };
        }).sort((a: any, b: any) => b.ltv - a.ltv).slice(0, limit);
        return { type: "members", rows: enriched };
      }
      const since = params?.since ? new Date(params.since).toISOString() : null;
      let q = admin
        .from("community_members")
        .select("user_id, joined_at")
        .eq("creator_id", creatorId)
        .order("joined_at", { ascending: false })
        .limit(limit);
      if (since) q = q.gte("joined_at", since);
      const { data, error } = await q;
      if (error) throw error;
      return { type: "members", rows: data };
    }

    case "revenue.summary": {
      const window = params?.window ?? "mtd";
      const now = new Date();
      let start: Date;
      let prevStart: Date | null = null;
      let prevEnd: Date | null = null;
      if (window === "mtd") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      } else if (window === "last_month") {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      } else {
        start = new Date(now.getTime() - 30 * 86400000);
        prevStart = new Date(now.getTime() - 60 * 86400000);
        prevEnd = start;
      }
      const sum = async (from: Date, to?: Date) => {
        let q = admin
          .from("member_subscriptions")
          .select("tier:subscription_tiers(price_monthly)", { count: "exact" })
          .eq("creator_id", creatorId)
          .eq("status", "active")
          .gte("created_at", from.toISOString());
        if (to) q = q.lt("created_at", to.toISOString());
        const { data, error } = await q;
        if (error) throw error;
        const total = (data ?? []).reduce(
          (s: number, r: any) => s + Number(r.tier?.price_monthly ?? 0),
          0,
        );
        return { total, count: data?.length ?? 0 };
      };
      const current = await sum(start);
      const previous = prevStart ? await sum(prevStart, prevEnd!) : null;
      return { type: "revenue", window, current, previous };
    }

    case "content.performance": {
      const limit = Math.min(Number(params?.limit ?? 10), 50);
      const days = params?.window === "7d" ? 7 : 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await admin
        .from("community_posts")
        .select("id, content, created_at")
        .eq("creator_id", creatorId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { type: "content", rows: data ?? [] };
    }

    case "tier.create": {
      const name = String(params?.name ?? "").slice(0, 80);
      const price = Number(params?.price_monthly);
      const description = String(params?.description ?? "").slice(0, 500);
      if (!name || !price || price <= 0) throw new Error("name and price_monthly required");

      // Reuse existing stripe-create-tier function via internal fetch
      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/stripe-create-tier`;
      const resp = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ name, description, price_monthly: price }),
      });
      const txt = await resp.text();
      if (!resp.ok) throw new Error(`tier create failed: ${txt.slice(0, 300)}`);
      return { type: "tier_created", data: JSON.parse(txt) };
    }

    case "email.draft": {
      // Drafts are stored in result; sending is left for explicit broadcast UI.
      return {
        type: "email_draft",
        segment: params?.segment ?? "all",
        subject: String(params?.subject ?? ""),
        body: String(params?.body ?? ""),
        note: "Draft saved. Send via Email Broadcast.",
      };
    }

    case "announcement.draft": {
      return {
        type: "announcement_draft",
        body: String(params?.body ?? ""),
        audience: params?.audience ?? "members",
        note: "Draft ready. Post from your profile when ready.",
      };
    }

    default:
      throw new Error(`Unknown intent: ${intent}`);
  }
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
