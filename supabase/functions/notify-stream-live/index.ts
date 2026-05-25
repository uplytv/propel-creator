// Fan-out push + (best-effort) email blast to a creator's followers when they go live.
// Idempotent per stream_id via stream_live_notifications table.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const caller = userData.user;

    const { stream_id, title, stream_url } = await req.json();
    if (!stream_id) throw new Error("stream_id required");

    // Look up stream — confirm caller owns it
    const { data: stream } = await supabase
      .from("streams")
      .select("id, creator_id, title")
      .eq("id", stream_id)
      .maybeSingle();
    if (!stream) throw new Error("Stream not found");
    if ((stream as any).creator_id !== caller.id) throw new Error("Not stream owner");

    // Idempotency guard — only notify once per stream
    const { data: existing } = await supabase
      .from("stream_live_notifications")
      .select("id")
      .eq("stream_id", stream_id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Creator display info
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", caller.id)
      .maybeSingle();
    const creatorName = (profile as any)?.display_name || (profile as any)?.username || "A creator you follow";
    const handle = (profile as any)?.username;

    // Get followers
    const { data: followers } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", caller.id);
    const followerIds = (followers || []).map((f: any) => f.follower_id);

    if (followerIds.length === 0) {
      await supabase.from("stream_live_notifications").insert({
        stream_id, creator_id: caller.id, recipient_count: 0,
      } as any);
      return new Response(JSON.stringify({ ok: true, recipients: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const liveUrl = stream_url || (handle ? `/${handle}/live/${stream_id}` : `/stream/${stream_id}`);
    const displayTitle = title || (stream as any).title || "is live now";

    // Best-effort push fan-out (existing helper)
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: followerIds,
          title: `🔴 ${creatorName} is live`,
          body: displayTitle,
          url: liveUrl,
        },
      });
    } catch (e) {
      console.error("[NOTIFY-STREAM-LIVE] push fan-out error", e);
    }

    // Best-effort in-app notification
    try {
      const rows = followerIds.map((uid: string) => ({
        user_id: uid,
        type: "stream_live",
        title: `${creatorName} is live`,
        body: displayTitle,
        link: liveUrl,
      }));
      await supabase.from("notifications").insert(rows as any);
    } catch (e) {
      console.error("[NOTIFY-STREAM-LIVE] notifications insert error", e);
    }

    await supabase.from("stream_live_notifications").insert({
      stream_id, creator_id: caller.id, recipient_count: followerIds.length,
    } as any);

    return new Response(JSON.stringify({ ok: true, recipients: followerIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[NOTIFY-STREAM-LIVE]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
