import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";

// THIN STUB — returns a JSON descriptor. To ship real .pkpass:
//   1. Upload Apple WWDR cert + Pass Type cert + key to secrets (APPLE_PASS_CERT, APPLE_PASS_KEY, APPLE_PASS_PASSWORD, APPLE_TEAM_ID, APPLE_PASS_TYPE_ID)
//   2. Use passkit-generator (Deno-compatible) to produce signed .pkpass
//   3. Flip feature_flag 'apple_wallet' to true
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const auth = req.headers.get("Authorization");
  if (!auth) return err("Unauthorized", 401);
  const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return err("Unauthorized", 401);

  const { ticket_id } = await req.json();
  if (!ticket_id) return err("ticket_id required");
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, events(title, venue_name, location_address, starts_at, cover_image_url)")
    .eq("id", ticket_id)
    .single();
  if (!ticket || ticket.owner_id !== u.user.id) return err("Forbidden", 403);

  const { data: flag } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", "apple_wallet")
    .single();

  if (!flag?.enabled) {
    return json({
      status: "stub",
      message:
        "Apple Wallet pass generation is awaiting cert configuration. Use the in-app QR meanwhile.",
    });
  }

  // TODO: real .pkpass generation goes here.
  return json({ status: "stub", message: "Implement passkit-generator with certs." });
});
