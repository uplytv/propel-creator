import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowLeft, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Discover() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: creators, isLoading } = useQuery({
    queryKey: ["discover-creators", search],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio, creator_type")
        .not("display_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,creator_type.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="container flex items-center gap-4 h-14">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Discover Creators</h1>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or creator type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card/40 p-6 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-3" />
                <div className="h-4 w-24 bg-secondary mx-auto rounded mb-2" />
                <div className="h-3 w-32 bg-secondary mx-auto rounded" />
              </div>
            ))}
          </div>
        ) : creators && creators.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {creators.map((creator: any, i: number) => (
              <motion.button
                key={creator.user_id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/creator/${encodeURIComponent(creator.display_name)}`)}
                className="rounded-2xl border border-border bg-card/40 p-6 text-center hover:border-primary/30 hover:shadow-md transition-all group"
              >
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt={creator.display_name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3 group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary mx-auto mb-3 group-hover:scale-105 transition-transform">
                    {(creator.display_name || "C").charAt(0)}
                  </div>
                )}
                <h3 className="font-semibold">{creator.display_name}</h3>
                {creator.creator_type && (
                  <span className="text-xs text-primary font-medium">{creator.creator_type}</span>
                )}
                {creator.bio && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{creator.bio}</p>
                )}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-1">No creators found</h3>
            <p className="text-muted-foreground">Try a different search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
