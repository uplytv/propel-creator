import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { GlobalEventCard, type GlobalEvent } from "./GlobalEventCard";

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "music", label: "Music" },
  { key: "sports", label: "Sports" },
  { key: "festival", label: "Festival" },
  { key: "arts", label: "Arts" },
  { key: "persian", label: "🇮🇷 Persian & Iranian" },
];

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "weekend", label: "This Weekend" },
  { key: "persian", label: "Persian & Cultural" },
];

export function WorldwideEventsTab() {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("upcoming");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadEvents = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 0 : page;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase.from("events_global").select("*").order("date", { ascending: true }).range(from, to);

    const now = new Date().toISOString();
    if (tab === "upcoming") q = q.gte("date", now);
    if (tab === "weekend") {
      const in3 = new Date(); in3.setDate(in3.getDate() + 3);
      q = q.gte("date", now).lte("date", in3.toISOString());
    }
    if (tab === "persian") q = q.eq("is_persian", true);

    if (filter === "persian") q = q.eq("is_persian", true);
    else if (filter !== "all") q = q.eq("category", filter);

    if (country) q = q.ilike("country", `%${country}%`);
    if (city) q = q.ilike("city", `%${city}%`);
    if (search) {
      q = q.or(`title.ilike.%${search}%,artist_name.ilike.%${search}%,venue.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data, error } = await q;
    if (error) console.error(error);
    const rows = (data as GlobalEvent[]) || [];
    setEvents(reset ? rows : [...events, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    if (reset) setPage(0);
    setLoading(false);
  }, [page, tab, filter, country, city, search, events]);

  useEffect(() => { loadEvents(true);   }, [tab, filter, country, city, search]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events, artists, venues, cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((t) => (
            <Button key={t.key} size="sm" variant={tab === t.key ? "default" : "outline"} onClick={() => setTab(t.key)} className="shrink-0">
              {t.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "secondary" : "ghost"} onClick={() => setFilter(f.key)} className="shrink-0">
              {f.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      {loading && events.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No events found. Try adjusting your filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e) => <GlobalEventCard key={e.id} event={e} />)}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => { setPage(page + 1); loadEvents(false); }} disabled={loading}>
                {loading ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
