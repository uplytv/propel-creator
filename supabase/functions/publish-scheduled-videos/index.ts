import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const now = new Date().toISOString();

    // Find videos scheduled to publish that are past their publish time
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, title, creator_id')
      .eq('visibility', 'private')
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', now);

    if (error) {
      console.error('Error fetching scheduled videos:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!videos || videos.length === 0) {
      return new Response(JSON.stringify({ published: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let published = 0;
    for (const video of videos) {
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          visibility: 'public',
          is_public: true,
          scheduled_publish_at: null,
        })
        .eq('id', video.id);

      if (updateError) {
        console.error(`Failed to publish video ${video.id}:`, updateError);
      } else {
        published++;
        console.log(`Published scheduled video: ${video.title} (${video.id})`);
      }
    }

    return new Response(JSON.stringify({ published, total: videos.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('publish-scheduled-videos error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
