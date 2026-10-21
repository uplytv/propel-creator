// Rebuilds the track_co_plays adjacency from recent sessions.
// A "session" = plays by same user within 30-min windows.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const since = new Date(Date.now() - 14 * 86400_000).toISOString();
    const { data: plays } = await supabase
      .from("track_plays")
      .select("user_id, track_id, played_at")
      .gte("played_at", since)
      .not("user_id", "is", null)
      .order("user_id", { ascending: true })
      .order("played_at", { ascending: true })
      .limit(50000);

    if (!plays?.length) {
      return new Response(JSON.stringify({ ok: true, pairs: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SESSION_MS = 30 * 60_000;
    const counts = new Map<string, number>();
    let cursorUser: string | null = null;
    let session: { track: string; ts: number }[] = [];

    const flush = () => {
      for (let i = 0; i < session.length; i++) {
        for (let j = i + 1; j < session.length; j++) {
          const a = session[i].track, b = session[j].track;
          if (a === b) continue;
          const [x, y] = a < b ? [a, b] : [b, a];
          const k = `${x}|${y}`;
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
      }
      session = [];
    };

    for (const p of plays as any[]) {
      const ts = new Date(p.played_at).getTime();
      if (p.user_id !== cursorUser) {
        flush();
        cursorUser = p.user_id;
      } else if (session.length && ts - session[session.length - 1].ts > SESSION_MS) {
        flush();
      }
      session.push({ track: p.track_id, ts });
    }
    flush();

    // Top N pairs
    const rows = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20000)
      .flatMap(([k, c]) => {
        const [a, b] = k.split("|");
        // store both directions for easy lookup
        return [
          { track_a: a, track_b: b, co_play_count: c, updated_at: new Date().toISOString() },
          { track_a: b, track_b: a, co_play_count: c, updated_at: new Date().toISOString() },
        ];
      });

    // Upsert in chunks
    let written = 0;
    for (let i = 0; i < rows.length; i += 1000) {
      const chunk = rows.slice(i, i + 1000);
      const { error } = await supabase.from("track_co_plays").upsert(chunk, {
        onConflict: "track_a,track_b",
      });
      if (!error) written += chunk.length;
    }

    return new Response(JSON.stringify({ ok: true, pairs: written }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
