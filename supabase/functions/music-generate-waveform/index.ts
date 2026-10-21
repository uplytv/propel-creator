// Generates and persists waveform peaks for a track.
// If `peaks` are supplied (client-side analysed), persist them.
// Otherwise generate deterministic pseudo peaks from the track id so
// WaveformBar always has something to render until real analysis runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicPeaks(trackId: string, count = 256): number[] {
  const rnd = mulberry32(hash(trackId));
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    // shape: gentle envelope so it looks like a song
    const env =
      0.4 +
      0.6 *
        Math.sin((i / count) * Math.PI) *
        (0.7 + 0.3 * rnd());
    const noise = 0.85 + 0.15 * rnd();
    out.push(Math.max(0.05, Math.min(1, env * noise)));
  }
  return out;
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const trackId: string | undefined = body?.trackId;
    const supplied: number[] | undefined = Array.isArray(body?.peaks)
      ? body.peaks
      : undefined;

    if (!trackId || typeof trackId !== "string") {
      return new Response(JSON.stringify({ error: "trackId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: track, error: tErr } = await supabase
      .from("tracks")
      .select("id, creator_id")
      .eq("id", trackId)
      .maybeSingle();

    if (tErr || !track) {
      return new Response(JSON.stringify({ error: "track not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (track.creator_id !== userId) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const peaks =
      supplied && supplied.length > 0
        ? supplied
            .slice(0, 1024)
            .map((n) => Math.max(0, Math.min(1, Number(n) || 0)))
        : deterministicPeaks(trackId, 256);

    const { error: upErr } = await supabase
      .from("tracks")
      .update({ waveform_peaks: peaks })
      .eq("id", trackId);

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, trackId, count: peaks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}));
