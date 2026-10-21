import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-alerts-cron-secret",
};

interface Row {
  id: string;
  email: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

const RENEW_WINDOW_DAYS = 3;

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // AuthZ: allow cron-secret header OR authenticated admin caller.
    const cronSecret = req.headers.get("x-alerts-cron-secret");
    const expectedSecret = Deno.env.get("BLAKE_ALERTS_CRON_SECRET");
    let authorized = !!(cronSecret && expectedSecret && cronSecret === expectedSecret);

    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const anon = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        );
        const { data: userData } = await anon.auth.getUser(
          authHeader.replace("Bearer ", ""),
        );
        if (userData?.user) {
          const { data: isAdmin } = await supabase.rpc("has_role", {
            _user_id: userData.user.id,
            _role: "admin",
          });
          authorized = !!isAdmin;
        }
      }
    }

    if (!authorized) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Pull all rows we might care about.
    const { data, error } = await supabase
      .from("blake_subscribers")
      .select("id,email,status,current_period_end,cancel_at_period_end,stripe_customer_id,stripe_subscription_id");
    if (error) throw error;

    const rows = (data || []) as Row[];
    const now = Date.now();
    const windowMs = RENEW_WINDOW_DAYS * 86400 * 1000;

    const pastDue = rows.filter((r) => ["past_due", "unpaid", "incomplete"].includes(r.status));
    const canceling = rows.filter((r) => r.status === "active" && r.cancel_at_period_end);
    const renewingSoon = rows.filter((r) => {
      if (r.status !== "active" || r.cancel_at_period_end) return false;
      if (!r.current_period_end) return false;
      const t = new Date(r.current_period_end).getTime();
      return t - now > 0 && t - now <= windowMs;
    });

    // Recipients = all admins.
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = (adminRoles || []).map((r: any) => r.user_id);

    const adminEmails: string[] = [];
    for (const uid of adminIds) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (u?.user?.email) adminEmails.push(u.user.email);
    }

    // Fallback recipient if no admins configured.
    const fallback = Deno.env.get("BLAKE_ALERTS_FALLBACK_EMAIL");
    if (adminEmails.length === 0 && fallback) adminEmails.push(fallback);

    const buckets: Array<{ kind: "past_due" | "canceling" | "renewing_soon"; rows: Row[]; bucketKey: string }> = [
      { kind: "past_due", rows: pastDue, bucketKey: new Date().toISOString().slice(0, 10) }, // daily
      { kind: "canceling", rows: canceling, bucketKey: new Date().toISOString().slice(0, 10) },
      { kind: "renewing_soon", rows: renewingSoon, bucketKey: new Date().toISOString().slice(0, 10) },
    ];

    const results: any[] = [];

    for (const bucket of buckets) {
      if (bucket.rows.length === 0) continue;
      const digestRows = bucket.rows.slice(0, 25).map((r) => ({
        email: r.email,
        status: r.status,
        current_period_end: r.current_period_end,
        cancel_at_period_end: r.cancel_at_period_end,
      }));

      for (const to of adminEmails) {
        const idempotencyKey = `blake-alert-${bucket.kind}-${bucket.bucketKey}-${hashEmail(to)}`;
        const { data: sendData, error: sendErr } = await supabase.functions.invoke(
          "send-transactional-email",
          {
            body: {
              templateName: "blake-subscription-alert",
              recipientEmail: to,
              idempotencyKey,
              templateData: {
                kind: bucket.kind,
                count: bucket.rows.length,
                rows: digestRows,
                dashboardUrl: "https://uply.tv/admin/blake-subscribers",
              },
            },
          },
        );
        results.push({ kind: bucket.kind, to, ok: !sendErr, error: sendErr?.message, sendData });
      }
    }

    return json({
      scanned: rows.length,
      recipients: adminEmails.length,
      alerts: {
        past_due: pastDue.length,
        canceling: canceling.length,
        renewing_soon: renewingSoon.length,
      },
      sent: results.length,
      results,
    });
  } catch (e) {
    console.error("[blake-subscription-alerts] error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hashEmail(email: string): string {
  let h = 0;
  const s = email.toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
