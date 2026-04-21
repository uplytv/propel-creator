import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json } from "../_shared/eventsCors.ts";

// THIN STUB — Google Wallet requires a service account JWT to mint a save-to-wallet URL.
// Set up: Create a Google Cloud service account, share it with Google Wallet Issuer Console,
// then sign a JWT with the EventTicketObject. Flip feature_flag 'google_wallet' on.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return json({ status: "stub", message: "Google Wallet pending issuer setup. Use in-app QR." });
});
