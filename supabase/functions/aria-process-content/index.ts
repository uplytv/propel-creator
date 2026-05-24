import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * ARIA Content Engine — Unified Pipeline
 * Handles: transcribe → analyze → generate → distribute → report
 * Accepts: { job_id } or { source_type, source_id, creator_id }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Require authentication. Either a valid user JWT (whose id will be used as
    // creator_id) or a service-role bearer token (for internal callers).
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = bearer && bearer === serviceKey;

    let authedUserId: string | null = null;
    if (!isServiceRole) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authedUserId = user.id;
    }

    const body = await req.json();
    let jobId = body.job_id;

    // Create job if not provided
    if (!jobId) {
      const { source_type, source_id } = body;
      // Force creator_id to authenticated user when not service-role
      const creator_id = isServiceRole ? body.creator_id : authedUserId;
      if (!source_type || !source_id || !creator_id) {
        return new Response(JSON.stringify({ error: "Missing source_type, source_id, or creator_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check concurrent job limit (max 3)
      const { count } = await supabase
        .from("aria_content_jobs")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creator_id)
        .in("status", ["queued", "transcribing", "analyzing", "generating", "distributing"]);

      if ((count || 0) >= 3) {
        return new Response(JSON.stringify({ error: "Maximum 3 concurrent ARIA jobs. Please wait for active jobs to complete." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resolve source title and duration
      let sourceTitle = "";
      let sourceDuration = 0;
      let muxAssetId = "";
      let playbackId = "";

      if (source_type === "stream_recording") {
        const { data: rec } = await supabase.from("stream_recordings").select("title, duration_seconds, mux_asset_id, playback_id").eq("id", source_id).single();
        if (rec) { sourceTitle = rec.title; sourceDuration = rec.duration_seconds || 0; muxAssetId = rec.mux_asset_id; playbackId = rec.playback_id; }
      } else if (source_type === "video") {
        const { data: vid } = await supabase.from("videos").select("title, duration_seconds, mux_asset_id, playback_id").eq("id", source_id).single();
        if (vid) { sourceTitle = vid.title; sourceDuration = vid.duration_seconds || 0; muxAssetId = vid.mux_asset_id; playbackId = vid.playback_id; }
      }

      const { data: job, error: jobErr } = await supabase.from("aria_content_jobs").insert({
        creator_id,
        source_type,
        source_id,
        source_title: sourceTitle,
        source_duration_seconds: sourceDuration,
        status: "queued",
        started_at: new Date().toISOString(),
      }).select("id").single();

      if (jobErr) throw new Error(`Failed to create job: ${jobErr.message}`);
      jobId = job.id;
    }

    // Fetch job
    const { data: job } = await supabase.from("aria_content_jobs").select("*").eq("id", jobId).single();
    if (!job) throw new Error("Job not found");

    // Resolve Mux IDs
    let muxAssetId = "";
    let playbackId = "";
    if (job.source_type === "stream_recording") {
      const { data: rec } = await supabase.from("stream_recordings").select("mux_asset_id, playback_id").eq("id", job.source_id).single();
      if (rec) { muxAssetId = rec.mux_asset_id; playbackId = rec.playback_id; }
    } else if (job.source_type === "video") {
      const { data: vid } = await supabase.from("videos").select("mux_asset_id, playback_id").eq("id", job.source_id).single();
      if (vid) { muxAssetId = vid.mux_asset_id; playbackId = vid.playback_id; }
    }

    // Get creator profile
    const { data: profile } = await supabase.from("profiles").select("display_name, creator_type, username").eq("user_id", job.creator_id).single();

    // ========== STAGE 1: TRANSCRIBE ==========
    await supabase.from("aria_content_jobs").update({ status: "transcribing", progress: 10 }).eq("id", jobId);

    let transcriptText = "";
    let summary = "";
    let topics: string[] = [];
    let utterances: any[] = [];

    // Check for existing transcript
    const { data: existingTranscript } = await supabase
      .from("stream_transcripts")
      .select("id, transcript_text, transcript_json")
      .eq("stream_recording_id", job.source_id)
      .maybeSingle();

    if (existingTranscript?.transcript_text) {
      transcriptText = existingTranscript.transcript_text;
      const tj = existingTranscript.transcript_json as any;
      summary = tj?.results?.summary?.short || "";
      topics = (tj?.results?.topics?.segments || []).flatMap((s: any) => s.topics?.map((t: any) => t.topic) || []);
      utterances = tj?.results?.utterances || [];
      await supabase.from("aria_content_jobs").update({ transcript_id: existingTranscript.id }).eq("id", jobId);
    } else {
      // Transcribe via Deepgram
      const deepgramKey = Deno.env.get("DEEPGRAM_API_KEY");
      if (deepgramKey && muxAssetId) {
        const audioUrl = `https://stream.mux.com/${playbackId}.m3u8`;
        const dgRes = await fetch(
          "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&paragraphs=true&utterances=true&diarize=true&punctuate=true&summarize=v2&detect_topics=true",
          {
            method: "POST",
            headers: { Authorization: `Token ${deepgramKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: audioUrl }),
          }
        );

        if (dgRes.ok) {
          const dgData = await dgRes.json();
          const paragraphs = dgData.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs || [];
          transcriptText = paragraphs.map((p: any) => p.sentences?.map((s: any) => s.text).join(" ") || "").join("\n\n");
          summary = dgData.results?.summary?.short || "";
          topics = (dgData.results?.topics?.segments || []).flatMap((s: any) => s.topics?.map((t: any) => t.topic) || []);
          utterances = dgData.results?.utterances || [];

          const { data: transcript } = await supabase.from("stream_transcripts").insert({
            stream_recording_id: job.source_id,
            creator_id: job.creator_id,
            transcript_text: transcriptText,
            transcript_json: dgData,
          }).select("id").single();

          if (transcript) {
            await supabase.from("aria_content_jobs").update({ transcript_id: transcript.id }).eq("id", jobId);
          }
        }
      }

      // Fallback: if no transcript available, use title/description
      if (!transcriptText) {
        transcriptText = `Content: ${job.source_title || "Untitled"}`;
      }
    }

    await supabase.from("aria_content_jobs").update({ progress: 25 }).eq("id", jobId);

    // ========== STAGE 2: ANALYZE ==========
    await supabase.from("aria_content_jobs").update({ status: "analyzing", progress: 30 }).eq("id", jobId);

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    // Chunk transcript for Claude (max ~8000 tokens ≈ 32000 chars)
    const truncatedTranscript = transcriptText.slice(0, 32000);

    const analysisRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `You are ARIA, the AI content strategist built into UPLY. You analyze creator content and identify the highest-value moments and content opportunities. You understand virality, engagement, and what makes content perform on TikTok, Instagram, YouTube Shorts, LinkedIn, and Twitter/X. Return ONLY valid JSON with no preamble or markdown. Follow the exact schema provided.`,
        messages: [{
          role: "user",
          content: `Analyze this creator content and return a JSON object with exactly this structure:
{
  "content_score": 0-100,
  "viral_potential": 0-100,
  "best_platform": "tiktok|instagram|youtube|linkedin|twitter",
  "content_summary": "2-3 sentence summary",
  "key_themes": ["theme1", "theme2", "theme3"],
  "target_audience": "description",
  "tone": "educational|entertaining|motivational|controversial|storytelling",
  "short_clips": [
    {
      "timestamp_start": 0,
      "timestamp_end": 60,
      "title": "clip title",
      "description": "what happens",
      "viral_score": 0-100,
      "emotion": "surprise|inspiration|education|humor|controversy",
      "recommended_duration": 45,
      "hook_text": "compelling opening line"
    }
  ],
  "course_topics": ["topic1", "topic2"],
  "key_quotes": ["quote1", "quote2", "quote3"],
  "call_to_action": "best CTA",
  "hashtags": {
    "tiktok": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
    "instagram": ["#tag1", "#tag2", "#tag3"],
    "youtube": ["#tag1", "#tag2", "#tag3"],
    "linkedin": ["#tag1", "#tag2"]
  }
}

Transcript: ${truncatedTranscript}
${summary ? `Summary: ${summary}` : ""}
${topics.length ? `Topics: ${topics.join(", ")}` : ""}
Duration: ${job.source_duration_seconds || 0} seconds
Creator type: ${profile?.creator_type || "general"}
Title: ${job.source_title || "Untitled"}

Generate between 5-15 clip suggestions based on the content length and quality. Each clip should be 15-90 seconds.`,
        }],
      }),
    });

    if (!analysisRes.ok) {
      const errText = await analysisRes.text();
      throw new Error(`Claude analysis failed: ${errText}`);
    }

    const analysisData = await analysisRes.json();
    const analysisText = analysisData.content?.[0]?.text || "{}";
    let analysis: any;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      // Try extracting JSON from markdown code block
      const match = analysisText.match(/```(?:json)?\s*([\s\S]*?)```/);
      analysis = match ? JSON.parse(match[1]) : { content_score: 50, short_clips: [], key_themes: [], key_quotes: [], hashtags: {} };
    }

    await supabase.from("aria_content_jobs").update({
      outputs: { analysis },
      progress: 45,
    }).eq("id", jobId);

    // ========== STAGE 3: GENERATE ==========
    await supabase.from("aria_content_jobs").update({ status: "generating", progress: 50 }).eq("id", jobId);

    // Get distribution settings
    const { data: distSettings } = await supabase.from("aria_distribution_settings").select("*").eq("creator_id", job.creator_id).maybeSingle();
    const maxClips = distSettings?.max_clips_per_job || 10;

    const clips = (analysis.short_clips || []).slice(0, maxClips);
    const generatedContent: any[] = [];

    // PARALLEL GENERATION
    const generateWithClaude = async (system: string, prompt: string) => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) { const e = await res.text(); console.error("Claude gen error:", e); return null; }
      const d = await res.json();
      const text = d.content?.[0]?.text || "";
      try { return JSON.parse(text); } catch {
        const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) try { return JSON.parse(m[1]); } catch {}
        return { raw: text };
      }
    };

    // Create Mux clips
    const muxTokenId = Deno.env.get("MUX_TOKEN_ID");
    const muxTokenSecret = Deno.env.get("MUX_TOKEN_SECRET");
    const muxAuth = muxTokenId && muxTokenSecret ? btoa(`${muxTokenId}:${muxTokenSecret}`) : null;

    const clipPromises = clips.map(async (clip: any, idx: number) => {
      let muxClipAssetId = null;
      let muxClipPlaybackId = null;

      if (muxAuth && playbackId && clip.timestamp_start !== undefined && clip.timestamp_end !== undefined) {
        try {
          const clipRes = await fetch("https://api.mux.com/video/v1/assets", {
            method: "POST",
            headers: { Authorization: `Basic ${muxAuth}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              input: [{ url: `https://stream.mux.com/${playbackId}.m3u8`, start_time: clip.timestamp_start, end_time: clip.timestamp_end }],
              playback_policy: ["public"],
            }),
          });
          if (clipRes.ok) {
            const clipData = await clipRes.json();
            muxClipAssetId = clipData.data?.id;
            muxClipPlaybackId = clipData.data?.playback_ids?.[0]?.id;
          }
        } catch (e) { console.error(`Clip ${idx} creation failed:`, e); }
      }

      return supabase.from("aria_generated_content").insert({
        job_id: jobId,
        creator_id: job.creator_id,
        content_type: "short_clip",
        title: clip.title || `Clip ${idx + 1}`,
        body: clip.description || "",
        metadata: {
          timestamp_start: clip.timestamp_start,
          timestamp_end: clip.timestamp_end,
          viral_score: clip.viral_score,
          emotion: clip.emotion,
          hook_text: clip.hook_text,
          duration: (clip.timestamp_end || 0) - (clip.timestamp_start || 0),
        },
        mux_clip_asset_id: muxClipAssetId,
        mux_clip_playback_id: muxClipPlaybackId,
        platform: analysis.best_platform || "tiktok",
      }).select("id").single();
    });

    // Text generation in parallel
    const contentSummary = analysis.content_summary || job.source_title || "";
    const themes = (analysis.key_themes || []).join(", ");
    const quotes = (analysis.key_quotes || []).join("\n");
    const targetAudience = analysis.target_audience || "";
    const tone = analysis.tone || "educational";
    const creatorName = profile?.display_name || "Creator";
    const creatorType = profile?.creator_type || "general";

    const textGenPromises = [
      // Twitter thread
      generateWithClaude(
        "You are a viral Twitter/X ghostwriter. Turn long-form content into a thread that people retweet. Each tweet max 280 chars. Use numbered format 1/ 2/ etc. End with a CTA tweet. Return JSON array of tweet objects.",
        `Turn this content into a 5-8 tweet thread. Key themes: ${themes}. Key quotes: ${quotes}. Creator type: ${creatorType}. Make tweet 1 the hook. Return JSON: [{"tweet_number": 1, "text": "tweet", "type": "hook|insight|story|cta"}]`
      ).then(async (data) => {
        if (!data) return;
        const tweets = Array.isArray(data) ? data : data.tweets || data.thread || [data];
        await supabase.from("aria_generated_content").insert({
          job_id: jobId, creator_id: job.creator_id, content_type: "tweet_thread",
          title: `Twitter Thread: ${job.source_title}`, body: tweets.map((t: any) => t.text).join("\n\n"),
          metadata: { tweets }, platform: "twitter",
        });
      }),

      // LinkedIn post
      generateWithClaude(
        "You are a LinkedIn ghostwriter who understands B2B content. Write posts that get shared by professionals. Use hook-story-lesson-CTA format. No emojis except sparingly. Max 1300 characters. Return JSON: {\"post\": \"full text\"}",
        `Write a professional LinkedIn post from this content. Summary: ${contentSummary}. Key themes: ${themes}. Creator: ${creatorName}. Target audience: ${targetAudience}.`
      ).then(async (data) => {
        if (!data) return;
        await supabase.from("aria_generated_content").insert({
          job_id: jobId, creator_id: job.creator_id, content_type: "linkedin_post",
          title: `LinkedIn: ${job.source_title}`, body: data.post || data.raw || JSON.stringify(data),
          platform: "linkedin",
        });
      }),

      // Community post
      generateWithClaude(
        "You are writing a post for a creator's paid community. The tone should be exclusive and behind-the-scenes. Make members feel like insiders.",
        `Write a community post sharing insights from this content. Key themes: ${themes}. Key quotes: ${quotes}. Include a personal reflection, the main lesson, and a question for discussion. Max 500 words. Return JSON: {"title": "post title", "body": "full post text"}`
      ).then(async (data) => {
        if (!data) return;
        await supabase.from("aria_generated_content").insert({
          job_id: jobId, creator_id: job.creator_id, content_type: "community_post",
          title: data.title || `Community: ${job.source_title}`, body: data.body || data.raw || "",
          platform: "uply",
        });
      }),

      // Course outline
      generateWithClaude(
        "You are a curriculum designer and online course expert. Turn creator content into a structured, sellable course outline. Return ONLY valid JSON.",
        `Create a course outline from this content. Topics: ${themes}. Transcript excerpt: ${truncatedTranscript.slice(0, 3000)}. Return JSON: {"course_title": "title", "course_subtitle": "subtitle", "target_student": "who", "course_promise": "what they achieve", "modules": [{"module_number": 1, "title": "title", "lessons": [{"lesson_number": 1, "title": "title", "duration_estimate": "X min", "key_takeaway": "point"}]}], "price_recommendation": 97}`
      ).then(async (data) => {
        if (!data) return;
        await supabase.from("aria_generated_content").insert({
          job_id: jobId, creator_id: job.creator_id, content_type: "course_outline",
          title: data.course_title || `Course: ${job.source_title}`,
          body: JSON.stringify(data, null, 2), metadata: data, platform: "uply",
        });
      }),

      // Sales page
      generateWithClaude(
        "You are a direct response copywriter who has written sales pages generating millions in revenue. Write persuasive, benefit-focused copy. Use AIDA framework. Return ONLY valid JSON.",
        `Write a complete sales page for content by ${creatorName}. Summary: ${contentSummary}. Target audience: ${targetAudience}. Key themes: ${themes}. Return JSON: {"headline": "main", "subheadline": "sub", "hero_paragraph": "opener", "pain_points": ["p1","p2","p3"], "benefits": ["b1","b2","b3"], "what_you_get": ["item1","item2"], "faq": [{"question": "q", "answer": "a"}], "cta_primary": "button text", "cta_urgency": "urgency line"}`
      ).then(async (data) => {
        if (!data) return;
        await supabase.from("aria_generated_content").insert({
          job_id: jobId, creator_id: job.creator_id, content_type: "sales_page",
          title: data.headline || `Sales Page: ${job.source_title}`,
          body: JSON.stringify(data, null, 2), metadata: data, platform: "uply",
        });
      }),

      // Email blast
      generateWithClaude(
        "You are an email copywriter specializing in creator newsletters. Write emails that get opened and clicked. Subject lines under 50 chars. Return ONLY valid JSON.",
        `Write an email blast announcing new content from ${creatorName}. Summary: ${contentSummary}. Key insight: ${quotes.split("\n")[0] || contentSummary}. Return JSON: {"subject_line": "subject", "preview_text": "preview", "headline": "headline", "opening_paragraph": "opener", "body_paragraph": "main 2-3 sentences", "key_insight": "quote or insight", "cta_text": "button text", "ps_line": "P.S. line"}`
      ).then(async (data) => {
        if (!data) return;
        await supabase.from("aria_generated_content").insert({
          job_id: jobId, creator_id: job.creator_id, content_type: "email_blast",
          title: data.subject_line || `Email: ${job.source_title}`,
          body: JSON.stringify(data, null, 2), metadata: data, platform: "uply",
        });
      }),

      // TikTok captions for each clip
      ...(clips.length > 0 ? [generateWithClaude(
        "You are a viral TikTok copywriter. Write captions that stop the scroll. Be direct, punchy. Return ONLY valid JSON.",
        `Write ${clips.length} TikTok captions for clips from this content. Clip descriptions: ${clips.map((c: any, i: number) => `${i + 1}. ${c.description || c.title}`).join("; ")}. Creator type: ${creatorType}. Target: ${targetAudience}. Tone: ${tone}. Return JSON: {"captions": [{"clip_index": 0, "caption": "text under 150 chars", "hook_line": "under 10 words", "hashtags": ["#tag1"]}]}`
      ).then(async (data) => {
        if (!data?.captions) return;
        for (const cap of data.captions) {
          await supabase.from("aria_generated_content").insert({
            job_id: jobId, creator_id: job.creator_id, content_type: "tiktok_caption",
            title: cap.hook_line || "TikTok Caption",
            body: `${cap.caption}\n\n${(cap.hashtags || []).join(" ")}`,
            metadata: { clip_index: cap.clip_index, hashtags: cap.hashtags },
            platform: "tiktok",
          });
        }
      })] : []),

      // Instagram captions
      ...(clips.length > 0 ? [generateWithClaude(
        "You are an Instagram growth expert. Write captions that drive saves and shares. Use line breaks. Include a question at the end. Return ONLY valid JSON.",
        `Write ${Math.min(clips.length, 5)} Instagram Reels captions for clips from: ${contentSummary}. Return JSON: {"captions": [{"caption": "text up to 300 words", "hashtags": ["#tag1"]}]}`
      ).then(async (data) => {
        if (!data?.captions) return;
        for (const cap of data.captions) {
          await supabase.from("aria_generated_content").insert({
            job_id: jobId, creator_id: job.creator_id, content_type: "instagram_caption",
            title: "Instagram Reel Caption",
            body: `${cap.caption}\n\n${(cap.hashtags || []).join(" ")}`,
            metadata: { hashtags: cap.hashtags },
            platform: "instagram",
          });
        }
      })] : []),
    ];

    // Execute all in parallel
    await Promise.allSettled([...clipPromises, ...textGenPromises]);

    await supabase.from("aria_content_jobs").update({ progress: 80 }).eq("id", jobId);

    // ========== STAGE 4: DISTRIBUTE ==========
    await supabase.from("aria_content_jobs").update({ status: "distributing", progress: 85 }).eq("id", jobId);

    // Auto-post community post if enabled
    if (distSettings?.auto_post_community && !distSettings?.require_approval) {
      const { data: communityContent } = await supabase
        .from("aria_generated_content")
        .select("*")
        .eq("job_id", jobId)
        .eq("content_type", "community_post")
        .limit(1)
        .maybeSingle();

      if (communityContent) {
        // Find creator's space
        const { data: space } = await supabase
          .from("creator_spaces")
          .select("id")
          .eq("creator_id", job.creator_id)
          .maybeSingle();

        if (space) {
          await supabase.from("community_posts").insert({
            author_id: job.creator_id,
            creator_id: job.creator_id,
            title: communityContent.title || "",
            body: communityContent.body || "",
            category: "general",
          });
          await supabase.from("aria_generated_content").update({ status: "published", published_at: new Date().toISOString() }).eq("id", communityContent.id);
        }
      }
    }

    // ========== STAGE 5: REPORT ==========
    // Count generated content
    const { count: totalGenerated } = await supabase
      .from("aria_generated_content")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId);

    const { count: clipCount } = await supabase
      .from("aria_generated_content")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("content_type", "short_clip");

    await supabase.from("aria_content_jobs").update({
      status: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
      outputs: { analysis, total_generated: totalGenerated || 0, clips: clipCount || 0 },
    }).eq("id", jobId);

    // Notify creator
    const durationMin = Math.round((job.source_duration_seconds || 0) / 60);
    await supabase.from("notifications").insert({
      user_id: job.creator_id,
      type: "aria_job_complete",
      title: `🎬 ARIA turned your ${durationMin}-minute ${job.source_type === "stream_recording" ? "stream" : "video"} into ${totalGenerated || 0} pieces of content`,
      message: `${clipCount || 0} clips ready · Posts, captions, and emails drafted — review in Content Studio`,
      link: "/dashboard/content-studio",
    });

    return new Response(JSON.stringify({ success: true, job_id: jobId, total_generated: totalGenerated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ARIA pipeline error:", err);

    // Try to mark job as failed
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.job_id) {
        await supabase.from("aria_content_jobs").update({ status: "failed", error_message: err.message }).eq("id", body.job_id);
      }
    } catch {}

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
