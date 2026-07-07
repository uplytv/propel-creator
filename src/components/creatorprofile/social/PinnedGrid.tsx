import { useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  creatorProfileId: string;
}

interface Pinned {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  media_url?: string | null;
}

/**
 * "Pinned" 2-3 column tile grid above the tab bar.
 * Source: creator_works rows with is_pinned column if present, falling back to
 * the 3 most recent posts. Lightweight and graceful when empty.
 */
export default function PinnedGrid({ creatorProfileId }: Props) {
  const { data: pinned = [] } = useQuery<Pinned[]>({
    queryKey: ["creator-pinned", creatorProfileId],
    enabled: !!creatorProfileId,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_works")
        .select("id,title,thumbnail_url,media_url,display_order")
        .eq("creator_id", creatorProfileId)
        .order("display_order", { ascending: true })
        .limit(3);
      return (data || []) as Pinned[];
    },
    staleTime: 60_000,
  });

  if (pinned.length < 1) return null;
  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-6">
      <h2 className="font-heading text-sm font-semibold mb-2 text-foreground inline-flex items-center gap-1.5">
        <Pin className="h-3.5 w-3.5 text-primary" /> Pinned
      </h2>
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {pinned.map((p) => (
          <div
            key={p.id}
            className="aspect-square rounded-md overflow-hidden bg-muted/30 relative"
            title={p.title}
          >
            {(p.thumbnail_url || p.media_url) && (
              <img
                src={p.thumbnail_url || p.media_url || ""}
                alt={p.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
