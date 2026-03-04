import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Handshake, Search, Users, Sparkles, TrendingUp, DollarSign,
  Send, Check, CheckCheck, Clock, ArrowRight, Star, Zap, Eye, X,
  Package, Percent, Calendar, MessageSquare, Crown, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────────────────────────
interface CreatorMatch {
  id: string;
  name: string;
  avatar: string;
  niche: string;
  members: string;
  revenue: string;
  compatibility: number;
  tags: string[];
  bio: string;
  topProduct: string;
}

interface Collaboration {
  id: string;
  partner: { name: string; avatar: string; niche: string };
  product: string;
  status: "pending" | "active" | "completed";
  split: [number, number];
  revenue: number;
  startDate: string;
  messages: number;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────
const suggestedMatches: CreatorMatch[] = [
  { id: "1", name: "Sarah Chen", avatar: "SC", niche: "Fitness & Nutrition", members: "12.4K", revenue: "$48K/mo", compatibility: 96, tags: ["Wellness", "Coaching", "High-ticket"], bio: "Helping busy professionals transform their health through sustainable habits.", topProduct: "12-Week Body Reboot" },
  { id: "2", name: "Priya Sharma", avatar: "PS", niche: "Language Learning", members: "3.6K", revenue: "$16K/mo", compatibility: 89, tags: ["Education", "Community", "Courses"], bio: "Making language learning fun and accessible through immersive community experiences.", topProduct: "Fluent in 90 Days" },
  { id: "3", name: "Devon Brooks", avatar: "DB", niche: "Web Development", members: "3.9K", revenue: "$18K/mo", compatibility: 84, tags: ["Tech", "Tutorials", "SaaS"], bio: "Teaching modern web development to career changers and aspiring freelancers.", topProduct: "Full-Stack Bootcamp" },
  { id: "4", name: "Mei Lin", avatar: "ML", niche: "Mindfulness", members: "2.8K", revenue: "$14K/mo", compatibility: 92, tags: ["Wellness", "Meditation", "Coaching"], bio: "Bringing calm and clarity to high-performers through guided mindfulness practices.", topProduct: "30-Day Mind Reset" },
  { id: "5", name: "Marcus Rivera", avatar: "MR", niche: "Photography", members: "8.7K", revenue: "$36K/mo", compatibility: 78, tags: ["Creative", "Courses", "Community"], bio: "Helping photographers build sustainable businesses through visual storytelling.", topProduct: "Photography Business Accelerator" },
  { id: "6", name: "Luna Zhang", avatar: "LZ", niche: "UX Design", members: "4.3K", revenue: "$19K/mo", compatibility: 81, tags: ["Design", "Tech", "Freelance"], bio: "Teaching designers to think strategically and land premium clients.", topProduct: "UX Portfolio Masterclass" },
];

const activeCollabs: Collaboration[] = [
  { id: "c1", partner: { name: "Aisha Patel", avatar: "AP", niche: "Business Strategy" }, product: "Creator Revenue Blueprint", status: "active", split: [50, 50], revenue: 8420, startDate: "2 weeks ago", messages: 14 },
  { id: "c2", partner: { name: "Jake Morrison", avatar: "JM", niche: "Music Production" }, product: "Sound + Strategy Masterclass", status: "pending", split: [60, 40], revenue: 0, startDate: "3 days ago", messages: 5 },
  { id: "c3", partner: { name: "Tyler Knox", avatar: "TK", niche: "Strength Training" }, product: "Total Wellness Program", status: "completed", split: [50, 50], revenue: 15200, startDate: "2 months ago", messages: 32 },
];

interface ChatMessage {
  id: string;
  sender: "you" | "partner";
  text: string;
  time: string;
  read?: boolean;
}

const mockChats: Record<string, ChatMessage[]> = {
  c1: [
    { id: "m1", sender: "partner", text: "Hey! Excited to launch the Blueprint together 🚀", time: "2 weeks ago" },
    { id: "m2", sender: "you", text: "Same here! I've drafted the first 3 modules. Want to review?", time: "2 weeks ago" },
    { id: "m3", sender: "partner", text: "Absolutely. I'll add the automation section this week.", time: "13 days ago" },
    { id: "m4", sender: "you", text: "Perfect. Should we do a 50/50 split on the launch promo too?", time: "12 days ago" },
    { id: "m5", sender: "partner", text: "Yes, let's keep it even. I'll set up the co-branded landing page.", time: "12 days ago" },
    { id: "m6", sender: "you", text: "Landing page looks amazing! We already have 12 pre-signups.", time: "10 days ago" },
    { id: "m7", sender: "partner", text: "That's incredible! I shared it with my email list — expecting a wave.", time: "9 days ago" },
    { id: "m8", sender: "you", text: "47 enrolled now! Revenue dashboard is looking 🔥", time: "3 days ago" },
    { id: "m9", sender: "partner", text: "Love it! Let's plan a live Q&A for next week to boost engagement.", time: "2 days ago" },
    { id: "m10", sender: "you", text: "Great idea. Thursday at 3pm work for you?", time: "1 day ago" },
    { id: "m11", sender: "partner", text: "Thursday works! I'll prep some case studies to share.", time: "5 hours ago" },
  ],
  c2: [
    { id: "m1", sender: "you", text: "Hey Jake! Love your production courses. Want to collab?", time: "3 days ago" },
    { id: "m2", sender: "partner", text: "I'm in! A sound + strategy combo would be unique.", time: "3 days ago" },
    { id: "m3", sender: "you", text: "Exactly my thinking. I'll draft a proposal with 60/40 split since I'll handle the strategy modules.", time: "2 days ago" },
    { id: "m4", sender: "partner", text: "Fair deal. Let me outline the music production modules.", time: "2 days ago" },
    { id: "m5", sender: "you", text: "Sent the proposal! Check it out when you get a chance 🎵", time: "1 day ago" },
  ],
  c3: [
    { id: "m1", sender: "partner", text: "Great working with you on Total Wellness! Final revenue: $15.2K 🎉", time: "1 month ago" },
    { id: "m2", sender: "you", text: "What a ride! $7.6K each. Want to do a v2?", time: "1 month ago" },
    { id: "m3", sender: "partner", text: "Definitely! Let's plan for Q2. Maybe add a nutrition component.", time: "3 weeks ago" },
  ],
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// ── Component ──────────────────────────────────────────────────────────────────
export default function Collaborate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [selectedCreator, setSelectedCreator] = useState<CreatorMatch | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [splitValue, setSplitValue] = useState([50]);
  const [proposalMessage, setProposalMessage] = useState("");
  const [proposalProduct, setProposalProduct] = useState("");
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(mockChats);
  const [chatInput, setChatInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChatCollab = chatOpen ? activeCollabs.find(c => c.id === chatOpen) : null;

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatOpen, chatMessages, partnerTyping]);

  // Mark partner messages as read when chat opens
  useEffect(() => {
    if (!chatOpen) return;
    setChatMessages(prev => {
      const msgs = prev[chatOpen];
      if (!msgs) return prev;
      const updated = msgs.map(m => m.sender === "partner" && !m.read ? { ...m, read: true } : m);
      return { ...prev, [chatOpen]: updated };
    });
  }, [chatOpen]);

  const handleSendChat = () => {
    if (!chatInput.trim() || !chatOpen) return;
    const newMsg: ChatMessage = { id: `m${Date.now()}`, sender: "you", text: chatInput.trim(), time: "Just now", read: false };
    setChatMessages(prev => ({ ...prev, [chatOpen]: [...(prev[chatOpen] || []), newMsg] }));
    setChatInput("");

    // Simulate partner reading after 1s, then typing, then reply
    const currentChatId = chatOpen;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Mark as read after 1s
    setTimeout(() => {
      setChatMessages(prev => {
        const msgs = prev[currentChatId];
        if (!msgs) return prev;
        return { ...prev, [currentChatId]: msgs.map(m => ({ ...m, read: true })) };
      });
    }, 1000);

    // Partner starts typing after 1.5s
    typingTimeoutRef.current = setTimeout(() => {
      setPartnerTyping(true);

      // Partner sends reply after 2-4s of typing
      const replyDelay = 2000 + Math.random() * 2000;
      typingTimeoutRef.current = setTimeout(() => {
        setPartnerTyping(false);
        const replies = [
          "That sounds great! Let's make it happen 🙌",
          "Love this direction. I'll work on it today!",
          "Agreed! Let me check my calendar and get back to you.",
          "Perfect — this is going to be huge for both of us!",
          "Nice! I'll pull some data on this and share my thoughts.",
        ];
        const reply: ChatMessage = {
          id: `m${Date.now()}`,
          sender: "partner",
          text: replies[Math.floor(Math.random() * replies.length)],
          time: "Just now",
          read: true,
        };
        setChatMessages(prev => ({ ...prev, [currentChatId]: [...(prev[currentChatId] || []), reply] }));
      }, replyDelay);
    }, 1500);
  };

  const filteredMatches = suggestedMatches.filter((c) => {
    if (nicheFilter !== "all" && !c.tags.map(t => t.toLowerCase()).includes(nicheFilter)) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.niche.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSendProposal = () => {
    toast({ title: "Proposal Sent! 🎉", description: `Your collaboration proposal has been sent to ${selectedCreator?.name}. They'll be notified.` });
    setProposalOpen(false);
    setSelectedCreator(null);
    setProposalMessage("");
    setProposalProduct("");
    setSplitValue([50]);
  };

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/20",
    active: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-muted text-muted-foreground border-border",
  };

  const statusIcons = { pending: Clock, active: Zap, completed: Check };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Co-Creator Lab</h1>
              <p className="text-muted-foreground text-sm">Combine audiences. Split revenue. Grow together.</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active Collabs", value: "1", icon: Handshake, color: "text-primary" },
            { label: "Joint Revenue", value: "$8,420", icon: DollarSign, color: "text-primary" },
            { label: "Audience Reach", value: "18.6K", icon: Users, color: "text-primary" },
            { label: "Avg Compatibility", value: "87%", icon: Sparkles, color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="discover" className="gap-2"><Search className="w-4 h-4" /> Discover</TabsTrigger>
            <TabsTrigger value="collaborations" className="gap-2"><Handshake className="w-4 h-4" /> My Collabs</TabsTrigger>
            <TabsTrigger value="builder" className="gap-2"><Package className="w-4 h-4" /> Joint Products</TabsTrigger>
          </TabsList>

          {/* ── Discover Tab ────────────────────────────────────────────────── */}
          <TabsContent value="discover" className="space-y-6">
            {/* AI Recommendation Banner */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 glow-border flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">AI-Powered Matching</p>
                <p className="text-xs text-muted-foreground mt-0.5">We analyze audience overlap, niche compatibility, and revenue potential to find your ideal co-creator partner.</p>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                6 matches found
              </Badge>
            </motion.div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search creators by name or niche..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {["all", "wellness", "tech", "creative", "education", "coaching"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setNicheFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                      nicheFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Creator Cards */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid md:grid-cols-2 gap-4">
              {filteredMatches.map((creator) => (
                <motion.div
                  key={creator.id}
                  variants={item}
                  className="glass-card p-5 hover:shadow-lg transition-all duration-300 group cursor-pointer"
                  onClick={() => setSelectedCreator(creator)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {creator.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate">{creator.name}</h3>
                        <div className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          <Sparkles className="w-3 h-3" />
                          {creator.compatibility}%
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{creator.niche}</p>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{creator.bio}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {creator.members}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {creator.revenue}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {creator.topProduct}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {creator.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary/80">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {filteredMatches.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No matches found. Try adjusting your filters.</p>
              </div>
            )}
          </TabsContent>

          {/* ── My Collabs Tab ──────────────────────────────────────────────── */}
          <TabsContent value="collaborations" className="space-y-4">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
              {activeCollabs.map((collab) => {
                const StatusIcon = statusIcons[collab.status];
                return (
                  <motion.div key={collab.id} variants={item} className="glass-card p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
                          {collab.partner.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{collab.product}</p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[collab.status]}`}>
                              <StatusIcon className="w-3 h-3" />
                              {collab.status.charAt(0).toUpperCase() + collab.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">with {collab.partner.name} · {collab.partner.niche}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 sm:gap-8">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Split</p>
                          <p className="text-sm font-bold">{collab.split[0]}/{collab.split[1]}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="text-sm font-bold text-primary">${collab.revenue.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Your Share</p>
                          <p className="text-sm font-bold">${Math.round(collab.revenue * collab.split[0] / 100).toLocaleString()}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setChatOpen(collab.id)}>
                          <MessageSquare className="w-3.5 h-3.5" /> {collab.messages}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </TabsContent>

          {/* ── Joint Products Tab ──────────────────────────────────────────── */}
          <TabsContent value="builder" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 glow-border text-center max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Joint Product Builder</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create a co-branded product page that showcases both creators. Revenue splits automatically based on your agreement — no manual tracking.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Co-Branded Page", icon: Eye, desc: "Both creators featured" },
                  { label: "Auto Revenue Split", icon: Percent, desc: "Instant payouts" },
                  { label: "Shared Analytics", icon: TrendingUp, desc: "Real-time tracking" },
                ].map((f) => (
                  <div key={f.label} className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-2">
                      <f.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>
              <Button variant="hero" className="gap-2" onClick={() => toast({ title: "Coming soon!", description: "The Joint Product Builder will be available once you have an active collaboration." })}>
                <Package className="w-4 h-4" /> Create Joint Product
              </Button>
            </motion.div>

            {/* Existing joint product */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background z-10">You</div>
                  <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background">AP</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Creator Revenue Blueprint</p>
                  <p className="text-xs text-muted-foreground">You + Aisha Patel · 50/50 split</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="font-bold">47</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="font-bold text-primary">$8,420</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/collaborate/product")}>
                    <Eye className="w-3.5 h-3.5" /> View Page
                  </Button>
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Creator Detail / Proposal Dialog ───────────────────────────────── */}
      <Dialog open={!!selectedCreator && !proposalOpen} onOpenChange={() => setSelectedCreator(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedCreator && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {selectedCreator.avatar}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{selectedCreator.name}</DialogTitle>
                    <DialogDescription>{selectedCreator.niche}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">{selectedCreator.bio}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="font-bold">{selectedCreator.members}</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="font-bold">{selectedCreator.revenue}</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">Match</p>
                    <p className="font-bold text-primary">{selectedCreator.compatibility}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Top Product</p>
                  <div className="glass-card p-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{selectedCreator.topProduct}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCreator.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedCreator(null)}>
                    Close
                  </Button>
                  <Button variant="hero" className="flex-1 gap-2" onClick={() => setProposalOpen(true)}>
                    <Send className="w-4 h-4" /> Send Proposal
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Proposal Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Collaboration Proposal
            </DialogTitle>
            <DialogDescription>
              Propose a joint venture with {selectedCreator?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Joint Product Name */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Joint Product Name</label>
              <Input
                placeholder="e.g., 'Wellness & Mindset Accelerator'"
                value={proposalProduct}
                onChange={(e) => setProposalProduct(e.target.value)}
              />
            </div>

            {/* Revenue Split */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Revenue Split</label>
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">You</div>
                    <span className="text-sm font-bold">{splitValue[0]}%</span>
                  </div>
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{100 - splitValue[0]}%</span>
                    <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">
                      {selectedCreator?.avatar}
                    </div>
                  </div>
                </div>
                <Slider
                  value={splitValue}
                  onValueChange={setSplitValue}
                  min={10}
                  max={90}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>You get more</span>
                  <span>They get more</span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Pitch</label>
              <Textarea
                placeholder="Explain why this collaboration would be amazing for both of you..."
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setProposalOpen(false)}>Cancel</Button>
              <Button variant="hero" className="flex-1 gap-2" onClick={handleSendProposal}>
                <Send className="w-4 h-4" /> Send Proposal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Chat Slide-out Panel ──────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && activeChatCollab && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
              onClick={() => setChatOpen(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-2xl"
            >
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {activeChatCollab.partner.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{activeChatCollab.partner.name}</p>
                  <p className="text-[11px] text-muted-foreground">{activeChatCollab.product}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">Online</span>
                </div>
                <button onClick={() => setChatOpen(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground ml-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

               {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(chatMessages[chatOpen] || []).map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === "you" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.sender === "you"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}>
                      <p>{msg.text}</p>
                      <div className={`flex items-center gap-1 mt-1 ${
                        msg.sender === "you" ? "justify-end" : ""
                      }`}>
                        <span className={`text-[10px] ${
                          msg.sender === "you" ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}>{msg.time}</span>
                        {msg.sender === "you" && (
                          msg.read
                            ? <CheckCheck className="w-3 h-3 text-primary-foreground/80" />
                            : <Check className="w-3 h-3 text-primary-foreground/40" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                <AnimatePresence>
                  {partnerTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="flex justify-start"
                    >
                      <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        />
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        />
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={handleSendChat}
                    disabled={!chatInput.trim()}
                    className="px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Messages are shared between you and your co-creator</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
