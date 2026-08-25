// Emails the UPLY admin when a partnership lead is submitted from the
// UPLY × Nexaflow AI landing page. Independent of any Stripe/Mux webhook.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TODO(manual): set PARTNER_LEADS_ADMIN_EMAIL secret to route notifications elsewhere.
const ADMIN_EMAIL = Deno.env.get("PARTNER_LEADS_ADMIN_EMAIL") || "uplytv@gmail.com";

const esc = (s: unknown) => String(s ?? "—").replace(/</g, "&lt;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: lead, error } = await admin
      .from("partner_leads")
      .select("*")
      .eq("id", lead_id)
      .maybeSingle();
    if (error || !lead) throw new Error(error?.message || "Lead not found");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#ffffff;color:#0b0b0f;padding:32px 20px;">
        <div style="max-width:560px;margin:0 auto;">
          <h1 style="margin:0 0 4px;font-size:22px;">New Revenue System lead</h1>
          <p style="margin:0 0 20px;color:#666;">UPLY × Nexaflow AI — /partners/nexaflow</p>
          <div style="border:1px solid #eee;border-radius:12px;padding:20px;">
            <p style="margin:6px 0;"><strong>Name:</strong> ${esc(lead.name)}</p>
            <p style="margin:6px 0;"><strong>Business:</strong> ${esc(lead.business)}</p>
            <p style="margin:6px 0;"><strong>Email:</strong> ${esc(lead.email)}</p>
            <p style="margin:6px 0;"><strong>Phone:</strong> ${esc(lead.phone)}</p>
            <p style="margin:6px 0;"><strong>Monthly revenue:</strong> ${esc(lead.monthly_revenue)}</p>
            <p style="margin:6px 0;"><strong>Tier:</strong> ${esc(lead.tier)} (${esc(lead.billing_period)})</p>
            <p style="margin:6px 0;color:#888;font-size:12px;">Source: ${esc(lead.source)}</p>
          </div>
        </div>
      </div>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "UPLY <noreply@notify.uply.tv>",
        to: [ADMIN_EMAIL],
        subject: `New Revenue System lead: ${lead.name} — ${lead.business || "—"}`,
        html,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("notify-partner-lead error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
