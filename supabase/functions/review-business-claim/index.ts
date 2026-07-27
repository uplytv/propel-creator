// Approve/reject a claim request. Admin-only. On approve: transfers business
// profile ownership to the requester (via SECURITY DEFINER RPC), sets
// business_status='live', and emails both admin + requester via Resend.
// Independent of any Stripe/Mux webhook.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "UPLY <notify@notify.uply.tv>",
      to: [to],
      subject,
      html,
    }),
  }).catch(() => {});
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Unauthorized");

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin only");

    const { claim_id, decision, reviewer_notes } = await req.json();
    if (!claim_id || !["approve", "reject"].includes(decision)) {
      throw new Error("claim_id and decision (approve|reject) required");
    }

    const { data: claim, error: claimErr } = await admin
      .from("claim_requests")
      .select("id, business_id, requester_user_id, requester_email, requester_name, status")
      .eq("id", claim_id)
      .maybeSingle();
    if (claimErr || !claim) throw new Error("Claim not found");
    if (claim.status !== "pending") throw new Error(`Claim already ${claim.status}`);

    const { data: biz } = await admin
      .from("profiles")
      .select("id, username")
      .eq("id", claim.business_id)
      .maybeSingle();
    const businessUrl = biz?.username ? `https://uply.tv/${biz.username}` : "";

    if (decision === "approve") {
      // Use the SECURITY DEFINER function under the acting admin's identity so
      // has_role(auth.uid()) evaluates correctly.
      const { error: transferErr } = await userClient.rpc(
        "transfer_business_ownership",
        { _business_id: claim.business_id, _new_owner: claim.requester_user_id },
      );
      if (transferErr) throw new Error(`Transfer failed: ${transferErr.message}`);
    }

    const { error: updateErr } = await admin
      .from("claim_requests")
      .update({
        status: decision === "approve" ? "approved" : "rejected",
        reviewer_notes: reviewer_notes ?? null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", claim_id);
    if (updateErr) throw updateErr;

    // Notify requester
    if (decision === "approve") {
      await sendEmail(
        claim.requester_email,
        "Your UPLY business page is live",
        `<p>Hi ${claim.requester_name},</p>
         <p>Your claim has been approved. Your business page is now live at <a href="${businessUrl}">${businessUrl}</a> and connected to your UPLY account.</p>
         <p>— The UPLY team</p>`,
      );
    } else {
      await sendEmail(
        claim.requester_email,
        "Your UPLY claim request",
        `<p>Hi ${claim.requester_name},</p>
         <p>We reviewed your claim for ${businessUrl} and could not approve it at this time.${reviewer_notes ? ` Notes: ${reviewer_notes}` : ""}</p>
         <p>If you believe this is an error, reply to this email.</p>`,
      );
    }
    // Notify admin
    if (user.email) {
      await sendEmail(
        user.email,
        `Claim ${decision}d — ${businessUrl}`,
        `<p>You ${decision}d the claim from ${claim.requester_name} (${claim.requester_email}) for ${businessUrl}.</p>`,
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
