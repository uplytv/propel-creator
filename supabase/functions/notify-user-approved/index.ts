import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: "No userIds provided" }), { status: 400, headers: corsHeaders });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Missing API key" }), { status: 500, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user emails from auth
    const results: { email: string; success: boolean }[] = [];

    for (const userId of userIds) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, first_name")
          .eq("user_id", userId)
          .single();

        const { data: authData } = await supabase.auth.admin.getUserById(userId);
        const email = authData?.user?.email;
        if (!email) {
          results.push({ email: userId, success: false });
          continue;
        }

        const name = profile?.display_name || profile?.first_name || "there";

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">
        <tr><td style="text-align:center;padding-bottom:30px;">
          <span style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#6366f1,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">UPLY</span>
        </td></tr>
        <tr><td style="background:#f8fafc;border-radius:16px;padding:40px 32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">🎉</div>
          <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 12px;">You're In, ${name}!</h1>
          <p style="font-size:15px;color:#64748b;line-height:1.6;margin:0 0 28px;">
            Your UPLY account has been approved! You now have full access to the platform — start creating, streaming, and growing your community.
          </p>
          <a href="https://propel-creator.lovable.app/dashboard" 
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
            Go to Dashboard →
          </a>
        </td></tr>
        <tr><td style="text-align:center;padding-top:24px;">
          <p style="font-size:12px;color:#94a3b8;margin:0;">Welcome to the UPLY creator community.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "UPLY <noreply@notify.uply.tv>",
            to: [email],
            subject: "🎉 You're approved! Welcome to UPLY",
            html,
          }),
        });

        results.push({ email, success: res.ok });
        if (!res.ok) {
          console.error(`Failed to send to ${email}:`, await res.text());
        }
      } catch (e) {
        console.error(`Error for user ${userId}:`, e);
        results.push({ email: userId, success: false });
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.success).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
