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

  try {
    const deepgramKey = Deno.env.get("DEEPGRAM_API_KEY");
    if (!deepgramKey) {
      return new Response(
        JSON.stringify({ error: "Deepgram API key not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { stream_recording_id, mux_asset_id } = await req.json();
    if (!stream_recording_id || !mux_asset_id) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get creator_id from stream_recordings
    const { data: recording } = await supabase
      .from("stream_recordings")
      .select("creator_id")
      .eq("id", stream_recording_id)
      .single();

    if (!recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch Mux asset to get download URL
    const muxTokenId = Deno.env.get("MUX_TOKEN_ID")!;
    const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET")!;
    const muxAuth = btoa(`${muxTokenId}:${muxTokenSecret}`);

    const muxRes = await fetch(`https://api.mux.com/video/v1/assets/${mux_asset_id}`, {
      headers: { Authorization: `Basic ${muxAuth}` },
    });

    if (!muxRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch Mux asset" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const muxData = await muxRes.json();
    const playbackId = muxData.data?.playback_ids?.[0]?.id;
    if (!playbackId) {
      return new Response(JSON.stringify({ error: "No playback ID found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioUrl = `https://stream.mux.com/${playbackId}.m3u8`;

    // Send to Deepgram
    const dgRes = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&paragraphs=true&diarize=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: audioUrl }),
      }
    );

    if (!dgRes.ok) {
      const errText = await dgRes.text();
      return new Response(JSON.stringify({ error: "Deepgram error", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dgData = await dgRes.json();

    // Extract transcript text from paragraphs
    const paragraphs = dgData.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs || [];
    const transcriptText = paragraphs
      .map((p: any) => p.sentences?.map((s: any) => s.text).join(" ") || "")
      .join("\n\n");

    // Store transcript
    await supabase.from("stream_transcripts").insert({
      stream_recording_id,
      creator_id: recording.creator_id,
      transcript_text: transcriptText,
      transcript_json: dgData,
    });

    // Call generate-shorts to identify high-energy moments
    try {
      await supabase.functions.invoke("generate-shorts", {
        body: { stream_recording_id, transcript: transcriptText },
      });
    } catch (e) {
      console.error("generate-shorts call failed (non-blocking):", e);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
