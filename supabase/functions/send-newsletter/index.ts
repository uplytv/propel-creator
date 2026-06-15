const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { newsletter_id } = await req.json();
    if (!newsletter_id) return new Response(JSON.stringify({ error: "newsletter_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get newsletter
    const { data: newsletter, error: nlErr } = await supabase
      .from("creator_newsletters")
      .select("*")
      .eq("id", newsletter_id)
      .single();
    if (nlErr || !newsletter) return new Response(JSON.stringify({ error: "Newsletter not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get creator profile
    const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url, user_id").eq("id", newsletter.creator_id).single();
    if (!profile || profile.user_id !== user.id) return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Update status to sending
    await supabase.from("creator_newsletters").update({ status: "sending" }).eq("id", newsletter_id);

    // Get members based on recipient_type
    const membersQuery = supabase.from("community_members").select("user_id").eq("creator_id", profile.user_id).eq("email_opt_in", true);
    const { data: members } = await membersQuery;
    if (!members?.length) {
      await supabase.from("creator_newsletters").update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: 0 }).eq("id", newsletter_id);
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get user emails from auth
    const memberIds = members.map((m: any) => m.user_id);
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    authUsers?.users?.forEach((u: any) => { if (memberIds.includes(u.id)) emailMap.set(u.id, u.email); });

    // Check suppression
    const { data: suppressed } = await supabase.from("suppressed_emails").select("email");
    const suppressedSet = new Set((suppressed || []).map((s: any) => s.email));

    let sentCount = 0;
    const fromName = profile.display_name || "UPLY Creator";

    for (const [userId, email] of emailMap.entries()) {
      if (suppressedSet.has(email)) continue;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: `${fromName} <noreply@notify.uply.tv>`,
            to: [email],
            subject: newsletter.subject,
            html: newsletter.html_content || `<p>${newsletter.plain_text_content || ""}</p>`,
            text: newsletter.plain_text_content || "",
          }),
        });

        const status = res.ok ? "sent" : "bounced";
        await supabase.from("newsletter_recipients").upsert({
          newsletter_id, user_id: userId, email, status, sent_at: new Date().toISOString(),
        }, { onConflict: "newsletter_id,user_id" });

        if (res.ok) sentCount++;
      } catch {
        // continue on individual failures
      }
    }

    await supabase.from("creator_newsletters").update({
      status: "sent", sent_at: new Date().toISOString(), recipient_count: sentCount,
    }).eq("id", newsletter_id);

    return new Response(JSON.stringify({ sent: sentCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
