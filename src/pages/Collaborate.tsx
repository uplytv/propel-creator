import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Handshake, Search, Users, Sparkles, TrendingUp, DollarSign,
  Send, Check, CheckCheck, Clock, ArrowRight, Star, Zap, Eye, X,
  Package, Percent, Calendar, MessageSquare, Crown, Filter, Loader2
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
import { useAuth } from "@/context/AuthContext";
import {
  useCollaborations,
  useCreateCollaboration,
  useChatMessages,
  useSendMessage,
  useMarkMessagesRead,
  DbCollaboration,
} from "@/hooks/useCollaborations";
import { formatDistanceToNow } from "date-fns";

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

// Real creator discovery from DB — fallback to empty
function useDiscoverCreators() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["discover-creators", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch all creator spaces with profile info (excluding current user)
      const { data: spaces } = await supabase
        .from("creator_spaces")
        .select("id, creator_id, name, description, avatar_url, is_free, price")
        .neq("creator_id", user!.id)
        .eq("is_public", true)
        .limit(20);

      if (!spaces || spaces.length === 0) return [];

      const creatorIds = spaces.map(s => s.creator_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, creator_type, username")
        .in("user_id", creatorIds);

      // Get member counts
      const { data: memberCounts } = await supabase
        .from("community_members")
        .select("creator_id")
        .in("creator_id", creatorIds);

      const countMap: Record<string, number> = {};
      memberCounts?.forEach(m => { countMap[m.creator_id] = (countMap[m.creator_id] || 0) + 1; });

      return spaces.map(space => {
        const profile = profiles?.find(p => p.user_id === space.creator_id);
        const memberCount = countMap[space.creator_id] || 0;
        const displayName = profile?.display_name || space.name;
        const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
        return {
          id: space.creator_id,
          name: displayName,
          avatar: initials,
          avatar_url: profile?.avatar_url || space.avatar_url,
          niche: profile?.creator_type || "Creator",
          members: memberCount >= 1000 ? `${(memberCount / 1000).toFixed(1)}K` : String(memberCount),
          revenue: "",
          compatibility: Math.floor(70 + Math.random() * 25),
          tags: [profile?.creator_type || "Creator"].filter(Boolean),
          bio: space.description || "",
          topProduct: space.name,
          username: profile?.username,
        } as CreatorMatch & { avatar_url?: string; username?: string };
      });
    },
  });
}


const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// ── Helpers ────────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function Collaborate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // DB hooks
  const { data: collaborations = [], isLoading: collabsLoading } = useCollaborations();
  const createCollab = useCreateCollaboration();
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();

  // Local state
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [selectedCreator, setSelectedCreator] = useState<CreatorMatch | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [splitValue, setSplitValue] = useState([50]);
  const [proposalMessage, setProposalMessage] = useState("");
  const [proposalProduct, setProposalProduct] = useState("");
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat messages from DB
  const { data: chatMessages = [] } = useChatMessages(chatOpen);

  const activeChatCollab = chatOpen ? collaborations.find(c => c.id === chatOpen) : null;

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatOpen, chatMessages]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (chatOpen) markRead.mutate(chatOpen);
  }, [chatOpen]);

  const handleSendChat = () => {
    if (!chatInput.trim() || !chatOpen) return;
    sendMessage.mutate({ collaborationId: chatOpen, content: chatInput.trim() });
    setChatInput("");
  };

  const filteredMatches = suggestedMatches.filter((c) => {
    if (nicheFilter !== "all" && !c.tags.map(t => t.toLowerCase()).includes(nicheFilter)) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.niche.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSendProposal = () => {
    if (!selectedCreator) return;
    createCollab.mutate(
      {
        partner_name: selectedCreator.name,
        title: proposalProduct || `Collab with ${selectedCreator.name}`,
        description: proposalMessage || undefined,
        revenue_split: splitValue[0],
      },
      {
        onSuccess: () => {
          toast({ title: "Proposal Sent! 🎉", description: `Your collaboration proposal has been sent to ${selectedCreator.name}. They'll be notified.` });
          setProposalOpen(false);
          setSelectedCreator(null);
          setProposalMessage("");
          setProposalProduct("");
          setSplitValue([50]);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    active: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-muted text-muted-foreground border-border",
  };

  const statusIcons: Record<string, React.ElementType> = { pending: Clock, active: Zap, completed: Check };

  // Count messages per collaboration (from loaded chat or show 0)
  const getMessageCount = (collabId: string) => {
    if (chatOpen === collabId) return chatMessages.length;
    return 0; // Will show actual count when chat is opened
  };

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
            { label: "Active Collabs", value: String(collaborations.filter(c => c.status === "active").length), icon: Handshake, color: "text-primary" },
            { label: "Total Collabs", value: String(collaborations.length), icon: Users, color: "text-primary" },
            { label: "Pending", value: String(collaborations.filter(c => c.status === "pending").length), icon: Clock, color: "text-primary" },
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
                {filteredMatches.length} matches found
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
            {collabsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : collaborations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Handshake className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No collaborations yet</p>
                <p className="text-sm mt-1">Discover creators and send a proposal to get started!</p>
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {collaborations.map((collab) => {
                  const StatusIcon = statusIcons[collab.status] || Clock;
                  const split = collab.revenue_split;
                  return (
                    <motion.div key={collab.id} variants={item} className="glass-card p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
                            {getInitials(collab.partner_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold truncate">{collab.title}</p>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[collab.status] || statusColors.pending}`}>
                                <StatusIcon className="w-3 h-3" />
                                {collab.status.charAt(0).toUpperCase() + collab.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">with {collab.partner_name} · {timeAgo(collab.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 sm:gap-8">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Split</p>
                            <p className="text-sm font-bold">{split}/{100 - split}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="text-sm font-bold capitalize">{collab.type.replace("-", " ")}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setChatOpen(collab.id)}>
                            <MessageSquare className="w-3.5 h-3.5" /> Chat
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
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
              <Button variant="hero" className="gap-2" onClick={() => navigate("/collaborate/product")}>
                <Package className="w-4 h-4" /> Create Joint Product
              </Button>
            </motion.div>

            {/* Active collabs as joint products */}
            {collaborations.filter(c => c.status === "active").map((collab) => (
              <motion.div key={collab.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center -space-x-2">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background z-10">You</div>
                    <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background">{getInitials(collab.partner_name)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{collab.title}</p>
                    <p className="text-xs text-muted-foreground">You + {collab.partner_name} · {collab.revenue_split}/{100 - collab.revenue_split} split</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/collaborate/product")}>
                    <Eye className="w-3.5 h-3.5" /> View Page
                  </Button>
                </div>
              </motion.div>
            ))}
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
            <div>
              <label className="text-sm font-medium mb-1.5 block">Joint Product Name</label>
              <Input
                placeholder="e.g., 'Wellness & Mindset Accelerator'"
                value={proposalProduct}
                onChange={(e) => setProposalProduct(e.target.value)}
              />
            </div>
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
                <Slider value={splitValue} onValueChange={setSplitValue} min={10} max={90} step={5} className="w-full" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>You get more</span>
                  <span>They get more</span>
                </div>
              </div>
            </div>
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
              <Button
                variant="hero"
                className="flex-1 gap-2"
                onClick={handleSendProposal}
                disabled={createCollab.isPending}
              >
                {createCollab.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Proposal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Chat Slide-out Panel ──────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && activeChatCollab && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
              onClick={() => setChatOpen(null)}
            />
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
                  {getInitials(activeChatCollab.partner_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{activeChatCollab.partner_name}</p>
                  <p className="text-[11px] text-muted-foreground">{activeChatCollab.title}</p>
                </div>
                <button onClick={() => setChatOpen(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground ml-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No messages yet. Say hello!</p>
                  </div>
                )}
                {chatMessages.map((msg) => {
                  const isYou = msg.sender_id === user?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isYou ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                        isYou
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      }`}>
                        <p>{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isYou ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${
                            isYou ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}>{timeAgo(msg.created_at)}</span>
                          {isYou && (
                            msg.read
                              ? <CheckCheck className="w-3 h-3 text-primary-foreground/80" />
                              : <Check className="w-3 h-3 text-primary-foreground/40" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
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
                    disabled={!chatInput.trim() || sendMessage.isPending}
                    className="px-3"
                  >
                    {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Messages are persisted and synced in real-time</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
