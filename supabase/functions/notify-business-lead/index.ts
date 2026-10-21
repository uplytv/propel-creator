import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fires when a lead is submitted from a public business profile.
// Emails the business owner (and admin fallbacks) using Resend.
serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: lead, error: leadErr } = await admin
      .from("business_leads")
      .select("id, business_id, name, phone, email, message, source, created_at")
      .eq("id", lead_id)
      .maybeSingle();
    if (leadErr || !lead) throw new Error(leadErr?.message || "Lead not found");

    const { data: biz } = await admin
      .from("business_details")
      .select("id, business_name, profile_id")
      .eq("id", lead.business_id)
      .maybeSingle();

    let ownerEmail: string | null = null;
    let username: string | null = null;
    if (biz?.profile_id) {
      const { data: prof } = await admin
        .from("profiles")
        .select("user_id, username")
        .eq("id", biz.profile_id)
        .maybeSingle();
      username = prof?.username ?? null;
      if (prof?.user_id) {
        const { data: userRow } = await admin.auth.admin.getUserById(prof.user_id);
        ownerEmail = userRow?.user?.email ?? null;
      }
    }

    const recipients = [ownerEmail, "uplytv@gmail.com"].filter(Boolean) as string[];
    if (!RESEND_API_KEY || recipients.length === 0) {
      return new Response(JSON.stringify({ success: false, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family:'Plus Jakarta Sans',sans-serif;background:#0a0a0a;color:#fff;padding:32px 20px;">
        <div style="max-width:520px;margin:0 auto;">
          <h1 style="color:#6B5BFF;margin:0 0 16px;">New lead for ${biz?.business_name ?? "your business"}</h1>
          <div style="background:#161616;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;">
            <p style="margin:6px 0;"><strong>Name:</strong> ${lead.name || "—"}</p>
            <p style="margin:6px 0;"><strong>Phone:</strong> ${lead.phone || "—"}</p>
            <p style="margin:6px 0;"><strong>Email:</strong> ${lead.email || "—"}</p>
            <p style="margin:6px 0;"><strong>Source:</strong> ${lead.source}</p>
            <p style="margin:12px 0 6px;"><strong>Message:</strong></p>
            <p style="white-space:pre-wrap;color:#ddd;">${(lead.message || "").replace(/</g, "&lt;")}</p>
          </div>
          ${username ? `<p style="margin-top:16px;"><a href="https://uply.tv/${username}" style="color:#6B5BFF;">View your business page</a></p>` : ""}
        </div>
      </div>`;

    await Promise.all(
      recipients.map((to) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "UPLY <noreply@notify.uply.tv>",
            to: [to],
            subject: `New lead: ${lead.name || "Anonymous"} — ${biz?.business_name ?? "UPLY"}`,
            html,
          }),
        })
      )
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("notify-business-lead error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
