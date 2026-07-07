import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, User, Play, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  type: "creator" | "video" | "community";
  title: string;
  subtitle?: string;
  image?: string | null;
  link: string;
}

interface SearchSuggestionsProps {
  onSearchSubmit?: (query: string) => void;
}

const SearchSuggestions = memo(function SearchSuggestions({ onSearchSubmit }: SearchSuggestionsProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setLoading(true);
    const term = `%${q.trim()}%`;

    const [profiles, videos, spaces] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, username, avatar_url").or(`display_name.ilike.${term},username.ilike.${term}`).limit(3),
      supabase.from("videos").select("id, title, playback_id, creator_id, slug").ilike("title", term).eq("is_public", true).limit(3),
      supabase.from("creator_spaces").select("id, creator_id, name, avatar_url, slug").ilike("name", term).eq("is_public", true).limit(3),
    ]);

    const results: Suggestion[] = [];

    if (profiles.data) {
      for (const p of profiles.data as any[]) {
        results.push({
          id: p.user_id,
          type: "creator",
          title: p.display_name || p.username || "Creator",
          subtitle: p.username ? `@${p.username}` : undefined,
          image: p.avatar_url,
          link: `/creator/${p.username || p.user_id}`,
        });
      }
    }

    if (videos.data) {
      for (const v of videos.data as any[]) {
        results.push({
          id: v.id,
          type: "video",
          title: v.title || "Untitled",
          image: v.playback_id ? `https://image.mux.com/${v.playback_id}/thumbnail.jpg?width=120&height=68` : null,
          link: `/creator/${v.creator_id}/videos/${v.slug || v.id}`,
        });
      }
    }

    if (spaces.data) {
      for (const s of spaces.data as any[]) {
        results.push({
          id: s.id,
          type: "community",
          title: s.name,
          image: s.avatar_url,
          link: `/community/${s.creator_id}/community`,
        });
      }
    }

    setSuggestions(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      onSearchSubmit?.(query.trim());
    }
  };

  const typeIcon = { creator: User, video: Play, community: Users };
  const typeLabel = { creator: "Creator", video: "Video", community: "Community" };

  // Group suggestions by type
  const grouped = suggestions.reduce((acc, s) => {
    if (!acc[s.type]) acc[s.type] = [];
    acc[s.type].push(s);
    return acc;
  }, {} as Record<string, Suggestion[]>);

  return (
    <div className="relative w-full md:max-w-[480px] md:mx-auto">
      <form onSubmit={handleSubmit}>
        <div className={cn(
          "flex items-center gap-2 px-4 h-10 rounded-full border transition-all duration-200",
          "bg-card border-border",
          open && query.length >= 2 && "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]"
        )}>
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search creators, videos, communities..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setSuggestions([]); }} className="text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-12 left-0 right-0 z-40 rounded-lg border border-border bg-card shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
            {(["creator", "video", "community"] as const).map((type) => {
              const items = grouped[type];
              if (!items?.length) return null;
              const Icon = typeIcon[type];
              return (
                <div key={type}>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/30">
                    {typeLabel[type]}s
                  </div>
                  {items.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { navigate(s.link); setOpen(false); setQuery(""); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-secondary/50 transition-colors"
                    >
                      {s.image ? (
                        <img src={s.image} alt={s.title} loading="lazy" className={cn("w-8 h-8 object-cover", type === "video" ? "rounded" : "rounded-full")} />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{s.title}</p>
                        {s.subtitle && <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{typeLabel[type]}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

SearchSuggestions.displayName = "SearchSuggestions";

export default SearchSuggestions;
