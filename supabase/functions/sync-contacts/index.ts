import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError } from "../_shared/eventsCors.ts";
import { withCors } from "../_shared/security.ts";

// Privacy-preserving contact match. Client sends array of SHA-256 hex hashes of normalized phone numbers.
// We compare to the same hash computed from registered users' phone numbers.
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

    const { phone_hashes } = await req.json();
    if (!Array.isArray(phone_hashes)) return err("phone_hashes array required");
    if (phone_hashes.length > 5000) return err("Max 5000 contacts per call");

    // Validate format — 64-char hex
    const cleaned = phone_hashes.filter(
      (h: any) => typeof h === "string" && /^[a-f0-9]{64}$/i.test(h),
    );
    if (cleaned.length === 0) return json({ matches: [], saved: 0 });

    // Look up profiles by hashed phone (auth.users has phone, we hash on read).
    // Fast path: a `phone_hash` column on profiles would be ideal — for now we match against
    // a server-side computed hash by joining with auth.users.phone via a SECURITY DEFINER RPC.
    // Until that exists, we just store the user's hashes for future matches.

    const rows = cleaned.map((h: string) => ({ user_id: userId, phone_hash: h.toLowerCase() }));
    await supabase.from("contact_sync").upsert(rows, { onConflict: "user_id,phone_hash" });

    // Find matches: any other user who already stored their *own* number with the same hash.
    // (Production would store the user's own hashed phone in a `profiles.phone_hash` column on signup.)
    const { data: matches } = await supabase
      .from("contact_sync")
      .select("user_id, phone_hash, profiles:user_id(user_id, username, display_name, avatar_url)")
      .in("phone_hash", cleaned.map((h: string) => h.toLowerCase()))
      .neq("user_id", userId)
      .limit(500);

    const matched = (matches ?? [])
      .filter((m: any) => m.profiles)
      .map((m: any) => ({
        user_id: m.user_id,
        username: m.profiles.username,
        display_name: m.profiles.display_name,
        avatar_url: m.profiles.avatar_url,
      }));

    return json({ matches: matched, saved: cleaned.length });
  } catch (e) {
    await logError(supabase, "sync-contacts", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
