import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  creatorProfileId: string;
  workTypes: string[];
  title: string;
  layout?: "grid" | "list" | "feed";
  emptyMessage?: string;
}

interface Work {
  id: string;
  work_type: string;
  title: string;
  description?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  external_url?: string | null;
  is_member_only: boolean;
  display_order: number;
}

export default function CreatorWorksGrid({
  creatorProfileId,
  workTypes,
  title,
  layout = "grid",
  emptyMessage,
}: Props) {
  const { data: works = [], isLoading } = useQuery<Work[]>({
    queryKey: ["creator-works", creatorProfileId, workTypes.join(",")],
    enabled: !!creatorProfileId,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_works")
        .select("*")
        .eq("creator_id", creatorProfileId)
        .in("work_type", workTypes)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      return (data || []) as Work[];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <section className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="h-32 rounded-lg bg-card/30 animate-pulse" />
      </section>
    );
  }

  if (!works.length) {
    if (!emptyMessage) return null;
    return (
      <section className="max-w-[1200px] mx-auto px-6 py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  const gridCols =
    layout === "list"
      ? "grid-cols-1"
      : layout === "feed"
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <section className="max-w-[1200px] mx-auto px-6 py-8">
      <h2 className="font-heading text-xl font-semibold mb-4 text-foreground">{title}</h2>
      <div className={`grid ${gridCols} gap-3`}>
        {works.map((w) => {
          const Wrapper: any = w.external_url ? "a" : "div";
          const wrapperProps = w.external_url
            ? { href: w.external_url, target: "_blank", rel: "noopener noreferrer" }
            : {};
          return (
            <Wrapper
              key={w.id}
              {...wrapperProps}
              className="group block rounded-lg overflow-hidden border border-border/40 bg-card/40 hover:bg-card/60 transition"
            >
              {(w.thumbnail_url || w.media_url) && (
                <div className="aspect-square bg-muted/20 overflow-hidden">
                  <img
                    src={w.thumbnail_url || w.media_url || ""}
                    alt={w.title}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <div className="p-3">
                <h3 className="font-medium text-sm text-foreground line-clamp-1 inline-flex items-center gap-1">
                  {w.title}
                  {w.is_member_only && <Lock className="h-3 w-3 text-primary" />}
                  {w.external_url && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  )}
                </h3>
                {w.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{w.description}</p>
                )}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
