import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();
    
    if (!record) {
      return new Response(JSON.stringify({ error: "No record" }), { status: 400, headers: corsHeaders });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Missing API key" }), { status: 500, headers: corsHeaders });
    }

    const name = record.display_name || `${record.first_name || ""} ${record.last_name || ""}`.trim() || "Unknown";
    const adminEmails = ["arianshahbazi100@gmail.com", "uplytv@gmail.com"];
    const siteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "";

    const html = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; background: #0a0a0a; color: #fff; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto;">
          <h1 style="color: #00FF85; margin-bottom: 20px;">🚀 New UPLY Signup</h1>
          <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Role:</strong> ${record.role_type || "member"}</p>
            <p><strong>Referral Code:</strong> ${record.referral_code || "None"}</p>
            <p><strong>Signed up:</strong> ${new Date(record.created_at).toLocaleString()}</p>
          </div>
          <a href="https://uply.tv/admin/users" style="display: inline-block; background: #00FF85; color: #0a0a0a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">
            View in Admin Dashboard →
          </a>
        </div>
      </div>
    `;

    for (const email of adminEmails) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "UPLY <noreply@notify.uply.tv>",
          to: [email],
          subject: `🚀 New UPLY signup: ${name}`,
          html,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err: any) {
    console.error("notify-admin-on-signup error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}));
