import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err } from "../_shared/eventsCors.ts";

// THIN STUB — Google Wallet requires a service account JWT to mint a save-to-wallet URL.
// Setup: Google Cloud service account → Google Wallet Issuer Console → sign JWT with EventTicketObject.
// Set secrets: GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SA_EMAIL, GOOGLE_WALLET_SA_PRIVATE_KEY.
// Then flip feature_flags.key='google_wallet' to enabled.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
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
      .select("id, owner_id, qr_code_secret, ticket_number, events(title, venue_name, location_address, starts_at)")
      .eq("id", ticket_id)
      .single();
    if (!ticket || ticket.owner_id !== u.user.id) return err("Forbidden", 403);

    const { data: flag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "google_wallet")
      .maybeSingle();

    if (!flag?.enabled) {
      return json({
        status: "stub",
        provider: "google",
        message: "Google Wallet pass generation is awaiting issuer setup. Use the in-app QR meanwhile.",
      });
    }

    // TODO: real Google Wallet JWT signing here.
    return json({ status: "stub", provider: "google", message: "Implement Google Wallet JWT signing." });
  } catch (e) {
    return err((e as Error).message, 500);
  }
});
