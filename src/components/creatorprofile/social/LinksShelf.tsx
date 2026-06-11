import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  /** profiles.id (not user_id) — matches bio_links.creator_id */
  profileId: string;
}

interface BioLink {
  id: string;
  title: string;
  url: string;
  icon?: string | null;
  link_type?: string | null;
  click_count?: number | null;
  is_active: boolean;
  position: number;
}

export default function LinksShelf({ profileId }: Props) {
  const { data: links = [] } = useQuery<BioLink[]>({
    queryKey: ["bio-links-public", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("bio_links")
        .select("id,title,url,icon,link_type,click_count,is_active,position")
        .eq("creator_id", profileId)
        .eq("is_active", true)
        .order("position");
      return (data || []) as BioLink[];
    },
    staleTime: 60_000,
  });

  if (!links.length) return null;

  async function track(id: string, count: number) {
    try {
      await (supabase as any)
        .from("bio_links")
        .update({ click_count: (count || 0) + 1 })
        .eq("id", id);
    } catch {
      /* non-blocking */
    }
  }

  return (
    <section className="max-w-[680px] mx-auto px-4 sm:px-6 py-6">
      <h2 className="font-heading text-base font-semibold mb-3 text-foreground">Links</h2>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.id}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track(l.id, l.click_count || 0)}
              className="flex items-center justify-between gap-3 min-h-[56px] rounded-xl border border-border/60 bg-card/60 px-4 hover:bg-card transition"
            >
              <span className="flex items-center gap-3 min-w-0">
                {l.icon ? (
                  <img src={l.icon} alt="" loading="lazy" className="h-6 w-6 rounded" />
                ) : (
                  <span className="h-6 w-6 rounded bg-primary/15 inline-flex items-center justify-center text-[10px] font-bold text-primary">
                    {l.title.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="truncate text-sm font-medium text-foreground">{l.title}</span>
              </span>
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
