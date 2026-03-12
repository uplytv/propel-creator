import { motion } from "framer-motion";
import { Radio, Search } from "lucide-react";
import LiveDiscoveryFeed from "@/components/live/LiveDiscoveryFeed";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";

export default function Live() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('mux_live_streams')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('is_public', true);
      setLiveCount(count || 0);
    };
    fetchCount();

    const channel = supabase
      .channel('live-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mux_live_streams' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>
      <SEOHead
        title="Live Streams"
        description="Watch live streams from creators on Uply. Discover live content, tip your favorites, and join the conversation."
      />
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ backgroundColor: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(16px)' }}>
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Uply"
              className="h-[60px] cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/")}
            />
            <span className="text-white/10">|</span>
            <div className="flex items-center gap-1.5 text-[#00FF85]">
              <Radio className="w-4 h-4" />
              <span className="text-sm font-semibold">Live</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search streams, creators..."
                className="w-full rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-[#888888] focus:outline-none focus:ring-1 focus:ring-[#00FF85]/50 transition-colors border border-white/10"
                style={{ backgroundColor: '#111111' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  size="sm"
                  onClick={() => navigate("/go-live")}
                  className="bg-[#00FF85] text-[#0A0A0A] font-bold hover:brightness-110 border-0"
                >
                  <Radio className="w-3.5 h-3.5 mr-1.5" />
                  Go Live
                </Button>
                <Button variant="ghost" size="sm" className="text-[#888888] hover:text-white" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-[#888888] hover:text-white" onClick={() => navigate("/auth")}>Log in</Button>
                <Button size="sm" className="bg-[#00FF85] text-[#0A0A0A] font-bold hover:brightness-110 border-0" onClick={() => navigate("/auth")}>Start Free</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile search */}
      <div className="md:hidden pt-16 px-4 pb-2" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search streams..."
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#888888] focus:outline-none focus:ring-1 focus:ring-[#00FF85]/50 border border-white/10"
            style={{ backgroundColor: '#111111' }}
          />
        </div>
      </div>

      {/* Discovery Feed */}
      <section className="pt-4 md:pt-20 pb-20">
        <div className="container">
          <LiveDiscoveryFeed searchQuery={search} />
        </div>
      </section>
    </div>
  );
}
