import { useState, useMemo, useCallback } from "react";
import { Users, Download, Search, Mail, TrendingUp, UserPlus, Radio, Ticket, Link2, Filter, Tag, Plus, X, Upload, RefreshCw, Flame, SlidersHorizontal, Zap } from "lucide-react";
import CSVImport from "@/components/subscribers/CSVImport";
import SegmentBuilder, { type SegmentRule } from "@/components/subscribers/SegmentBuilder";
import SubscriberGrowthChart from "@/components/subscribers/SubscriberGrowthChart";
import LeadScoreBadge from "@/components/subscribers/LeadScoreBadge";
import LifecycleStageBadge from "@/components/subscribers/LifecycleStageBadge";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSubscribers, useSubscriberStats, useExportSubscribersCSV } from "@/hooks/useSubscribers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const sourceConfig: Record<string, { label: string; icon: typeof Radio; color: string }> = {
  stream_join: { label: "Live Stream", icon: Radio, color: "bg-red-500/10 text-red-400" },
  rsvp: { label: "RSVP", icon: Ticket, color: "bg-blue-500/10 text-blue-400" },
  membership: { label: "Membership", icon: Users, color: "bg-purple-500/10 text-purple-400" },
  link: { label: "Link", icon: Link2, color: "bg-yellow-500/10 text-yellow-400" },
  manual: { label: "Manual", icon: UserPlus, color: "bg-muted text-muted-foreground" },
};

export default function Subscribers() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const { data: subscribers = [], isLoading } = useSubscribers({ source: sourceFilter, search });
  const { data: stats } = useSubscriberStats();
  const exportCSV = useExportSubscribersCSV();
  const qc = useQueryClient();
  const [newTag, setNewTag] = useState("");
  const [tagTarget, setTagTarget] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showSegment, setShowSegment] = useState(false);
  const [segmentRules, setSegmentRules] = useState<SegmentRule[]>([]);

  // Get all unique tags for segment builder
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    subscribers.forEach(s => ((s as any).tags || []).forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [subscribers]);

  const activeSubscribers = useMemo(() => {
    let active = subscribers.filter(s => !s.unsubscribed);

    // Apply segment rules
    if (segmentRules.length > 0) {
      active = active.filter(sub => {
        return segmentRules.every(rule => {
          const val = Number(rule.value);
          const subAny = sub as any;
          switch (rule.field) {
            case "lead_score": {
              const score = subAny.lead_score || 0;
              if (rule.operator === "gte") return score >= val;
              if (rule.operator === "lte") return score <= val;
              if (rule.operator === "gt") return score > val;
              if (rule.operator === "lt") return score < val;
              if (rule.operator === "eq") return score === val;
              return true;
            }
            case "total_opens":
            case "total_clicks": {
              const count = subAny[rule.field] || 0;
              if (rule.operator === "gte") return count >= val;
              if (rule.operator === "lte") return count <= val;
              if (rule.operator === "gt") return count > val;
              if (rule.operator === "lt") return count < val;
              if (rule.operator === "eq") return count === val;
              return true;
            }
            case "tags": {
              const tags = subAny.tags || [];
              if (rule.operator === "contains") return tags.includes(rule.value);
              if (rule.operator === "not_contains") return !tags.includes(rule.value);
              return true;
            }
            case "source": {
              if (rule.operator === "eq") return sub.source === rule.value;
              if (rule.operator === "neq") return sub.source !== rule.value;
              return true;
            }
            case "days_since_signup": {
              const days = (Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60 * 60 * 24);
              if (rule.operator === "gte") return days >= val;
              if (rule.operator === "lte") return days <= val;
              return true;
            }
            case "last_open_days": {
              if (!subAny.last_open_at) return rule.operator === "gte"; // never opened = infinite days
              const days = (Date.now() - new Date(subAny.last_open_at).getTime()) / (1000 * 60 * 60 * 24);
              if (rule.operator === "gte") return days >= val;
              if (rule.operator === "lte") return days <= val;
              return true;
            }
            case "last_click_days": {
              if (!subAny.last_click_at) return rule.operator === "gte";
              const days = (Date.now() - new Date(subAny.last_click_at).getTime()) / (1000 * 60 * 60 * 24);
              if (rule.operator === "gte") return days >= val;
              if (rule.operator === "lte") return days <= val;
              return true;
            }
            default: return true;
          }
        });
      });
    }

    if (sortBy === "score") {
      return [...active].sort((a, b) => ((b as any).lead_score || 0) - ((a as any).lead_score || 0));
    }
    return active;
  }, [subscribers, sortBy, segmentRules]);

  const recalcScores = async () => {
    if (!user) return;
    const { error } = await supabase.rpc("recalculate_subscriber_lead_scores", { p_creator_id: user.id });
    if (error) { toast.error("Failed to recalculate"); return; }
    // Also recalculate lifecycle stages
    try { await supabase.rpc("recalculate_subscriber_lifecycle" as any, { p_creator_id: user.id }); } catch {}
    toast.success("Lead scores & lifecycle stages updated");
    qc.invalidateQueries({ queryKey: ["subscribers"] });
  };

  const addTag = async (subscriberId: string, currentTags: string[]) => {
    if (!newTag.trim()) return;
    const tag = newTag.trim().toLowerCase();
    if (currentTags.includes(tag)) { setNewTag(""); return; }
    const { error } = await supabase
      .from("subscribers")
      .update({ tags: [...currentTags, tag] })
      .eq("id", subscriberId);
    if (error) { toast.error("Failed to add tag"); return; }
    setNewTag("");
    qc.invalidateQueries({ queryKey: ["subscribers"] });
    toast.success(`Tag "${tag}" added`);
  };

  const removeTag = async (subscriberId: string, currentTags: string[], tagToRemove: string) => {
    const { error } = await supabase
      .from("subscribers")
      .update({ tags: currentTags.filter(t => t !== tagToRemove) })
      .eq("id", subscriberId);
    if (error) { toast.error("Failed to remove tag"); return; }
    qc.invalidateQueries({ queryKey: ["subscribers"] });
  };

  return (
    <AppLayout>
      <SEOHead title="Subscribers | UPLY" description="Manage your email subscribers" />
      <div className="min-h-screen pb-24">
        <BackNav label="Subscribers" />

        {/* Stats Row */}
        <div className="px-4 py-3 grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 border" style={{ background: "rgba(61, 124, 255,0.05)", borderColor: "rgba(61, 124, 255,0.15)" }}>
            <div className="text-2xl font-bold" style={{ color: "#3D7CFF" }}>{stats?.active ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="rounded-2xl p-4 border border-border bg-card">
            <div className="text-2xl font-bold text-foreground">{stats?.total ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="rounded-2xl p-4 border border-border bg-card">
            <div className="text-2xl font-bold text-foreground">{stats?.unsubscribed ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Unsub'd</div>
          </div>
        </div>

        {/* Source breakdown */}
        {stats?.bySource && Object.keys(stats.bySource).length > 0 && (
          <div className="px-4 pb-3 flex gap-2 flex-wrap">
            {Object.entries(stats.bySource).map(([src, count]) => {
              const cfg = sourceConfig[src] || sourceConfig.manual;
              return (
                <Badge key={src} variant="outline" className={`${cfg.color} text-[10px] px-2 py-0.5`}>
                  {cfg.label}: {count}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Growth Chart */}
        <SubscriberGrowthChart subscribers={subscribers} />

        {/* Filters */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search email or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl text-sm"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[110px] h-10 rounded-xl text-sm">
              <Filter className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="stream_join">Live Stream</SelectItem>
              <SelectItem value="rsvp">RSVP</SelectItem>
              <SelectItem value="membership">Membership</SelectItem>
              <SelectItem value="link">Link</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort & Actions */}
        <div className="px-4 pb-3 flex gap-2 flex-wrap">
          <Button
            variant={segmentRules.length > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSegment(true)}
            className="rounded-xl text-xs gap-1.5"
            style={segmentRules.length > 0 ? { background: "#3b82f6", color: "white" } : undefined}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {segmentRules.length > 0 ? `${segmentRules.length} rules · ${activeSubscribers.length} match` : "Segment"}
          </Button>
          <Button
            variant={sortBy === "score" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy(sortBy === "score" ? "date" : "score")}
            className="rounded-xl text-xs gap-1.5"
            style={sortBy === "score" ? { background: "#3D7CFF", color: "#0A0A0A" } : undefined}
          >
            <Flame className="w-3.5 h-3.5" /> {sortBy === "score" ? "By Score" : "Sort by Score"}
          </Button>
          <Button variant="outline" size="sm" onClick={recalcScores} className="rounded-xl text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Recalc Scores
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="rounded-xl text-xs gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Import
          </Button>
        </div>

        {/* Subscriber List */}
        <div className="px-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : activeSubscribers.length === 0 ? (
            <div className="text-center py-16">
              <Mail className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No subscribers yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Subscribers from streams, events, and links will appear here</p>
            </div>
          ) : (
            activeSubscribers.map(sub => {
              const cfg = sourceConfig[sub.source] || sourceConfig.manual;
              const Icon = cfg.icon;
              const subTags = (sub as any).tags || [];
              const leadScore = (sub as any).lead_score || 0;
              return (
                <div key={sub.id} className="p-3 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                      {(sub.name || sub.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{sub.name || sub.email}</span>
                        <Badge variant="outline" className={`${cfg.color} text-[9px] px-1.5 py-0 shrink-0`}>
                          <Icon className="w-2.5 h-2.5 mr-0.5" />{cfg.label}
                        </Badge>
                      </div>
                      {sub.name && (
                        <p className="text-xs text-muted-foreground truncate">{sub.email}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <LeadScoreBadge score={leadScore} />
                      <LifecycleStageBadge stage={(sub as any).lifecycle_stage || "new"} />
                      <p className="text-[10px] text-muted-foreground">{format(new Date(sub.created_at), "MMM d")}</p>
                    </div>
                  </div>

                  {/* Engagement mini-stats */}
                  {((sub as any).total_opens > 0 || (sub as any).total_clicks > 0 || sub.total_purchases > 0) && (
                    <div className="flex gap-3 pl-12 text-[10px] text-muted-foreground">
                      {(sub as any).total_opens > 0 && <span>📬 {(sub as any).total_opens} opens</span>}
                      {(sub as any).total_clicks > 0 && <span>🔗 {(sub as any).total_clicks} clicks</span>}
                      {sub.total_purchases > 0 && <span style={{ color: "#3D7CFF" }}>💰 {sub.total_purchases} purchases</span>}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pl-12">
                    {subTags.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 bg-accent/50 text-accent-foreground gap-0.5 cursor-pointer hover:bg-destructive/10"
                        onClick={() => removeTag(sub.id, subTags, tag)}
                      >
                        <Tag className="w-2.5 h-2.5" />{tag}
                        <X className="w-2 h-2 ml-0.5" />
                      </Badge>
                    ))}
                    <Popover open={tagTarget === sub.id} onOpenChange={open => { setTagTarget(open ? sub.id : null); setNewTag(""); }}>
                      <PopoverTrigger asChild>
                        <button className="w-5 h-5 rounded-full border border-dashed border-border flex items-center justify-center hover:border-primary transition-colors">
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" side="top">
                        <form
                          onSubmit={e => { e.preventDefault(); addTag(sub.id, subTags); }}
                          className="flex gap-1"
                        >
                          <Input
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            placeholder="Add tag..."
                            className="h-7 text-xs rounded-lg"
                            autoFocus
                          />
                          <Button type="submit" size="sm" className="h-7 px-2 text-xs rounded-lg">
                            Add
                          </Button>
                        </form>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <CSVImport open={showImport} onOpenChange={setShowImport} />
        <SegmentBuilder
          open={showSegment}
          onOpenChange={setShowSegment}
          onApply={setSegmentRules}
          availableTags={availableTags}
        />
      </div>
    </AppLayout>
  );
}
