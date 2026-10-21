import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError } from "../_shared/eventsCors.ts";
import { withCors } from "../_shared/security.ts";

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  let userId: string | null = null;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return err("Unauthorized", 401);
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return err("Unauthorized", 401);
    userId = u.user.id;
    const { qr_secret, event_id } = await req.json();
    if (!qr_secret) return err("qr_secret required");

    // Use atomic SECURITY DEFINER function to validate organizer & flip status
    const { data: result, error: rpcErr } = await supabase.rpc("check_in_ticket_secure", {
      p_qr_secret: qr_secret,
      p_scanner: userId,
    });
    if (rpcErr) throw rpcErr;
    return json(result, 200);
  } catch (e) {
    await logError(supabase, "scan-ticket", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
