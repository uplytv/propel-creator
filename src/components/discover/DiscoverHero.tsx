import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Info, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface HeroItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  playback_id?: string | null;
  type: "live" | "video" | "recording";
  category?: string | null;
  creator_name?: string;
  username?: string;
}

export default function DiscoverHero() {
  const navigate = useNavigate();
  const [hero, setHero] = useState<HeroItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Prefer top live stream, fall back to top trending video
      const { data: live } = await supabase
        .from("mux_live_streams_public")
        .select("id, title, mux_playback_id, viewer_count, category, user_id")
        .eq("status", "active")
        .eq("is_public", true)
        .order("viewer_count", { ascending: false })
        .limit(1);

      let pick: HeroItem | null = null;
      if (live && live[0]) {
        const s: any = live[0];
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", s.user_id)
          .maybeSingle();
        pick = {
          id: s.id,
          title: s.title || "Live Now",
          description: `${(s.viewer_count || 0).toLocaleString()} watching now`,
          playback_id: s.mux_playback_id,
          type: "live",
          category: s.category,
          creator_name: (p as any)?.display_name,
          username: (p as any)?.username,
        };
      } else {
        const { data: vids } = await supabase
          .from("videos")
          .select("id, title, description, thumbnail_url, playback_id, creator_id")
          .eq("is_public", true)
          .order("trending_score", { ascending: false })
          .limit(1);
        if (vids && vids[0]) {
          const v: any = vids[0];
          const { data: p } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("user_id", v.creator_id)
            .maybeSingle();
          pick = {
            id: v.id,
            title: v.title,
            description: v.description,
            thumbnail_url: v.thumbnail_url,
            playback_id: v.playback_id,
            type: "video",
            creator_name: (p as any)?.display_name,
            username: (p as any)?.username,
          };
        }
      }
      setHero(pick);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-muted animate-pulse" />;
  }
  if (!hero) return null;

  const bg =
    hero.thumbnail_url ||
    (hero.playback_id ? `https://image.mux.com/${hero.playback_id}/thumbnail.jpg?time=5&width=1600` : null);

  return (
    <section className="relative w-full aspect-[16/10] md:aspect-[21/9] overflow-hidden bg-black">
      {bg && (
        <img src={bg} alt={hero.title} className="absolute inset-0 w-full h-full object-cover" />
      )}
      {/* gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/40 to-transparent" />

      <div className="relative h-full flex flex-col justify-end px-4 md:px-12 pb-6 md:pb-16 max-w-3xl">
        {hero.type === "live" && (
          <span className="inline-flex w-fit items-center gap-1.5 mb-3 px-2 py-0.5 rounded text-[10px] font-bold bg-destructive text-destructive-foreground animate-pulse">
            ● LIVE NOW
          </span>
        )}
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground drop-shadow-2xl line-clamp-2">
          {hero.title}
        </h2>
        {hero.description && (
          <p className="mt-2 md:mt-3 text-sm md:text-base text-foreground/90 line-clamp-2 max-w-xl">
            {hero.description}
          </p>
        )}
        {hero.creator_name && (
          <p className="mt-1.5 text-xs md:text-sm text-muted-foreground">
            by <span className="font-semibold text-foreground">{hero.creator_name}</span>
          </p>
        )}
        <div className="mt-4 md:mt-5 flex items-center gap-2.5">
          <Button
            size="lg"
            className="gap-2 font-bold bg-foreground text-background hover:bg-foreground/90"
            onClick={() =>
              navigate(
                hero.type === "live"
                  ? `/stream/${hero.id}`
                  : `/stream/${hero.id}?type=vod`
              )
            }
          >
            <Play className="w-5 h-5 fill-current" /> Play
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="gap-2 font-semibold bg-foreground/20 text-foreground hover:bg-foreground/30 backdrop-blur-sm border-0"
            onClick={() => hero.username && navigate(`/${hero.username}`)}
          >
            <Info className="w-5 h-5" /> More Info
          </Button>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 hidden md:flex items-center gap-2 text-foreground/80">
        <button className="w-9 h-9 rounded-full border border-foreground/40 flex items-center justify-center hover:border-foreground/80 transition-colors">
          <Volume2 className="w-4 h-4" />
        </button>
        {hero.category && (
          <span className="px-2 py-1 text-[10px] font-semibold border-l-2 border-foreground/60 bg-background/40 backdrop-blur-sm">
            {hero.category}
          </span>
        )}
      </div>
    </section>
  );
}
