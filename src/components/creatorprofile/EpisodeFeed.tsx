import { useQuery } from "@tanstack/react-query";
import { Headphones, Lock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  creatorUserId: string;
  limit?: number;
}

interface Episode {
  id: string;
  title: string;
  description?: string | null;
  audio_url?: string | null;
  audio_duration?: number | null;
  episode_number?: number | null;
  is_members_only?: boolean | null;
  published_at?: string | null;
}

export default function EpisodeFeed({ creatorUserId, limit = 12 }: Props) {
  const { data: episodes = [], isLoading } = useQuery<Episode[]>({
    queryKey: ["creator-episodes", creatorUserId, limit],
    enabled: !!creatorUserId,
    queryFn: async () => {
      const { data: podcast } = await supabase
        .from("creator_podcasts")
        .select("id")
        .eq("creator_id", creatorUserId)
        .maybeSingle();
      if (!podcast?.id) return [];
      const { data } = await supabase
        .from("podcast_episodes")
        .select("id,title,description,audio_url,audio_duration,episode_number,is_members_only,published_at")
        .eq("podcast_id", podcast.id)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(limit);
      return (data || []) as Episode[];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <section className="max-w-[800px] mx-auto px-6 py-8">
        <div className="h-32 rounded-lg bg-card/30 animate-pulse" />
      </section>
    );
  }

  if (!episodes.length) return null;

  return (
    <section className="max-w-[800px] mx-auto px-6 py-8">
      <h2 className="font-heading text-xl font-semibold mb-4 text-foreground">Episodes</h2>
      <div className="space-y-3">
        {episodes.map((ep) => (
          <article
            key={ep.id}
            className="rounded-lg border border-border/40 bg-card/40 p-4"
          >
            <div className="flex items-start gap-3">
              <Headphones className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground inline-flex items-center gap-2">
                  {ep.episode_number ? `Ep ${ep.episode_number}: ` : ""}
                  {ep.title}
                  {ep.is_members_only && <Lock className="h-3 w-3 text-primary" />}
                </h3>
                {ep.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{ep.description}</p>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  {ep.published_at && format(new Date(ep.published_at), "MMM d, yyyy")}
                  {ep.audio_duration ? ` · ${Math.round(ep.audio_duration / 60)} min` : ""}
                </div>
                {ep.audio_url && !ep.is_members_only && (
                  <audio src={ep.audio_url} controls preload="none" className="mt-3 w-full" />
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
