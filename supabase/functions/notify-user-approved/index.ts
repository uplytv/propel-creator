import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userIds } = await req.json();
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: "No userIds provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const userId of userIds) {
      try {
        const { data: profile } = await supabase
          .from("profiles").select("display_name, first_name").eq("user_id", userId).maybeSingle();
        const { data: authData } = await supabase.auth.admin.getUserById(userId);
        const email = authData?.user?.email;
        if (!email) {
          results.push({ userId, success: false, error: "no email" });
          continue;
        }
        const name = profile?.display_name || profile?.first_name || undefined;

        const { error } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "beta-access-granted",
            recipientEmail: email,
            idempotencyKey: `beta-granted-${userId}`,
            templateData: { name },
          },
        });
        results.push({ userId, success: !error, error: error?.message });
      } catch (e) {
        results.push({ userId, success: false, error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.success).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-user-approved error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
