import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Image, Send, Trophy, Calendar, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";

const filters = ["All Posts", "Announcements", "Questions", "Wins"];

const mockPosts = [
  { id: 1, author: "Sarah Chen", tier: 3, tierName: "Scaling", avatar: "SC", content: "Just hit $5k MRR this month! 🎉 The growth plan from my rep was spot on. Focused on reducing churn by 15% and it made all the difference.", likes: 24, comments: 8, time: "2h ago", isWin: true },
  { id: 2, author: "Marcus Lee", tier: 2, tierName: "Rising", avatar: "ML", content: "Question for the community — what's working best for converting free members to paid right now? I'm seeing about 3% conversion and want to push it higher.", likes: 12, comments: 15, time: "4h ago", isWin: false },
  { id: 3, author: "Alex Rivera", tier: 4, tierName: "Elite", avatar: "AR", content: "📢 Announcement: We're launching our first virtual summit next month. Looking for 3 guest speakers. DM me if interested!", likes: 45, comments: 22, time: "6h ago", isWin: false },
];

const topContributors = [
  { name: "Sarah Chen", posts: 23, avatar: "SC" },
  { name: "Alex Rivera", posts: 18, avatar: "AR" },
  { name: "Jordan Kim", posts: 15, avatar: "JK" },
];

export default function Community() {
  const [filter, setFilter] = useState("All Posts");
  const [composeFocused, setComposeFocused] = useState(false);

  const filteredPosts = filter === "Wins" ? mockPosts.filter((p) => p.isWin) : mockPosts;
  const isEmpty = false;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Feed */}
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">Community</h1>

            {/* Compose */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 mb-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold flex-shrink-0">U</div>
                <div className="flex-1">
                  <textarea
                    placeholder="Share something with your community…"
                    className="w-full bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground min-h-[40px]"
                    rows={composeFocused ? 3 : 1}
                    onFocus={() => setComposeFocused(true)}
                    onBlur={() => setComposeFocused(false)}
                  />
                  {composeFocused && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                      <button className="p-2 rounded hover:bg-secondary"><Image className="w-4 h-4 text-muted-foreground" /></button>
                      <Button size="sm"><Send className="w-3.5 h-3.5 mr-1" /> Post</Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-sm px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {f === "Wins" && <span className="mr-1">🏆</span>}
                  {f}
                </button>
              ))}
            </div>

            {isEmpty ? (
              <div className="glass-card p-12 text-center">
                <span className="text-5xl mb-4 block">💬</span>
                <h3 className="text-xl font-bold mb-2">Your community is waiting to meet you.</h3>
                <p className="text-muted-foreground mb-6">Post your first introduction and start building connections.</p>
                <Button variant="hero" size="lg">Write Your First Post</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-card p-5 ${p.isWin ? "border-primary/20" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold flex-shrink-0">{p.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{p.author}</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{p.tierName}</span>
                          {p.isWin && <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-bold flex items-center gap-0.5"><Trophy className="w-3 h-3" /> Win</span>}
                          <span className="text-xs text-muted-foreground ml-auto">{p.time}</span>
                        </div>
                        <p className="text-sm mt-2 leading-relaxed">{p.content}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><Heart className="w-3.5 h-3.5" /> {p.likes}</button>
                          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><MessageCircle className="w-3.5 h-3.5" /> {p.comments}</button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-80 space-y-4">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top Contributors</h3>
              <div className="space-y-3">
                {topContributors.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-bold w-4">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">{c.avatar}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.posts} posts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Community Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Total Members</span>
                  <span className="font-bold">1,247</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Posts This Week</span>
                  <span className="font-bold">89</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary" /> Active Now</span>
                  <span className="font-bold">34</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
