import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  creatorUserId: string;
}

interface Highlight {
  id: string;
  highlight_title: string | null;
  highlight_cover_url: string | null;
  media_url?: string | null;
}

/**
 * Instagram-style Highlights row. Read-only on profile.
 * Stories where is_highlight = true are pinned forever.
 */
export default function HighlightsRow({ creatorUserId }: Props) {
  const { data: items = [] } = useQuery<Highlight[]>({
    queryKey: ["creator-highlights", creatorUserId],
    enabled: !!creatorUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("stories")
        .select("id,highlight_title,highlight_cover_url,media_url")
        .eq("user_id", creatorUserId)
        .eq("is_highlight", true)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as Highlight[];
    },
    staleTime: 60_000,
  });

  if (!items.length) return null;
  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-5">
      <ul className="flex gap-4 overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2 snap-x">
        {items.map((h) => {
          const cover = h.highlight_cover_url || h.media_url || "";
          return (
            <li key={h.id} className="snap-start shrink-0 w-[72px] text-center">
              <div className="rounded-full p-[2px] bg-gradient-to-tr from-primary via-fuchsia-500 to-amber-400">
                <div className="rounded-full bg-background p-[2px]">
                  {cover ? (
                    <img
                      src={cover}
                      alt={h.highlight_title || "Highlight"}
                      className="block h-[64px] w-[64px] rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-[64px] w-[64px] rounded-full bg-muted" />
                  )}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-foreground/80 line-clamp-1">
                {h.highlight_title || "Story"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
