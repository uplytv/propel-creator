import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  manualCoverUrl?: string | null;
  fallbackCoverUrl?: string | null;
  /** When manual is missing, derive from the user's most recent post media. */
  creatorUserId?: string;
  avatarUrl?: string | null;
  displayName: string;
  hasStoryRing?: boolean;
}

/**
 * Instagram-style cover + overlapping avatar.
 * - Manual upload (artist_profiles.header_image_url) wins
 * - Else profiles.cover_image_url
 * - Else most recent post media for that creator
 * - Else subtle gradient placeholder
 */
export default function CoverHeader({
  manualCoverUrl,
  fallbackCoverUrl,
  creatorUserId,
  avatarUrl,
  displayName,
  hasStoryRing,
}: Props) {
  const [autoCover, setAutoCover] = useState<string | null>(null);

  useEffect(() => {
    if (manualCoverUrl || fallbackCoverUrl || !creatorUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("posts")
        .select("media_url")
        .eq("user_id", creatorUserId)
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled && data?.[0]?.media_url) setAutoCover(data[0].media_url as string);
    })();
    return () => {
      cancelled = true;
    };
  }, [manualCoverUrl, fallbackCoverUrl, creatorUserId]);

  const cover = manualCoverUrl || fallbackCoverUrl || autoCover;

  return (
    <header className="relative">
      <div
        className="relative w-full h-[180px] sm:h-[240px] md:h-[300px] overflow-hidden"
        style={
          cover
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.55)), url(${cover})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background:
                  "linear-gradient(135deg, hsl(var(--muted) / 0.4), hsl(var(--background)))",
              }
        }
        aria-hidden={!cover}
      />
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="-mt-12 sm:-mt-14 flex items-end gap-4">
          <div
            className={
              "rounded-full p-[3px] " +
              (hasStoryRing
                ? "bg-gradient-to-tr from-primary via-fuchsia-500 to-amber-400"
                : "bg-background")
            }
          >
            <div className="rounded-full bg-background p-[2px]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="block h-[88px] w-[88px] sm:h-24 sm:w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-[88px] w-[88px] sm:h-24 sm:w-24 rounded-full bg-muted flex items-center justify-center text-2xl font-heading font-bold text-foreground">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
