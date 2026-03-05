import { motion } from "framer-motion";
import { Radio, Search } from "lucide-react";
import LiveDiscoveryFeed from "@/components/live/LiveDiscoveryFeed";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Live() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Uply"
              className="h-[74px] cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/")}
            />
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5 text-primary">
              <Radio className="w-4 h-4" />
              <span className="text-sm font-semibold">Live</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search streams, creators, topics..."
                className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate("/go-live")}>
                  <Radio className="w-3.5 h-3.5 mr-1.5" />
                  Go Live
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Log in</Button>
                <Button variant="default" size="sm" onClick={() => navigate("/auth")}>Start Free</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero banner */}
      <section className="pt-24 pb-8">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="live-badge flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold">
              <span className="live-dot w-2.5 h-2.5 rounded-full" />
              {8} LIVE NOW
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mb-2"
          >
            Discover Live Knowledge
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Watch creators teach, build, and share — live and unfiltered.
          </motion.p>
        </div>
      </section>

      {/* Discovery Feed */}
      <section className="pb-20">
        <div className="container">
          <LiveDiscoveryFeed />
        </div>
      </section>
    </div>
  );
}
