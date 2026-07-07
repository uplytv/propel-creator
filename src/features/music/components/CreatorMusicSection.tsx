import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TrackRow from "./TrackRow";

const sb = supabase;

interface Props {
  userId?: string;
  username?: string;
  isOwner?: boolean;
}

/**
 * Music section for the public CreatorProfile page.
 * Hidden if the creator has no published tracks AND viewer isn't the owner.
 */
export default function CreatorMusicSection({ userId, username, isOwner }: Props) {
  const { data: tracks } = useQuery({
    queryKey: ["creator-music-section", userId],
    queryFn: async () => {
      const { data } = await sb
        .from("tracks")
        .select("*")
        .eq("creator_id", userId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as any[];
    },
    enabled: !!userId,
  });

  const count = tracks?.length ?? 0;
  if (!isOwner && count === 0) return null;

  return (
    <section className="max-w-[720px] mx-auto px-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-bold flex items-center gap-2">
          <Music className="w-5 h-5" /> Music
        </h2>
        {username && (
          <Link to={`/${username}/music`} className="text-xs text-white/60">
            View all
          </Link>
        )}
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-sm text-white/60 mb-3">You haven't dropped a track yet.</p>
          <Link
            to="/music/upload"
            className="inline-block px-4 py-2 rounded-full text-white text-sm font-semibold"
            style={{ background: "linear-gradient(90deg,#3D7CFF,#B025FF)" }}
          >
            Upload your first track
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {tracks!.map((t, i) => (
            <TrackRow key={t.id} track={t} queue={tracks!} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
