import { useState } from "react";
import { Briefcase, Search, Loader2, Check, Lock, Send } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { differenceInDays } from "date-fns";

const typeLabels: Record<string, string> = { sponsored_stream: "Sponsored Stream", community_post: "Community Post", newsletter_feature: "Newsletter", full_partnership: "Full Partnership" };
const budgetFilters = [{ label: "All", min: 0, max: Infinity }, { label: "$0-500", min: 0, max: 500 }, { label: "$500-2K", min: 500, max: 2000 }, { label: "$2K-10K", min: 2000, max: 10000 }, { label: "$10K+", min: 10000, max: Infinity }];

export default function Marketplace() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const profileId = profile?.id;
  const [typeFilter, setTypeFilter] = useState("all");
  const [budgetFilter, setBudgetFilter] = useState(0);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [pitch, setPitch] = useState("");
  const [proposedRate, setProposedRate] = useState("");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["brand-campaigns"],
    queryFn: async () => {
      const { data } = await supabase.from("brand_campaigns").select("*, brand_profiles(*)").eq("status", "active").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: myApps = [] } = useQuery({
    queryKey: ["my-applications", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("campaign_applications").select("*, brand_campaigns(*, brand_profiles(*))").eq("creator_id", profileId!).order("applied_at", { ascending: false });
      return data || [];
    },
    enabled: !!profileId,
  });

  const applyMut = useMutation({
    mutationFn: async () => {
      if (!profileId || !applyingId) throw new Error("Missing data");
      const { error } = await supabase.from("campaign_applications").insert({
        campaign_id: applyingId, creator_id: profileId, pitch, proposed_rate: proposedRate ? Number(proposedRate) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Application submitted!" });
      setApplyingId(null); setPitch(""); setProposedRate("");
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const bf = budgetFilters[budgetFilter];
  const filtered = campaigns.filter((c: any) => {
    if (typeFilter !== "all" && c.campaign_type !== typeFilter) return false;
    if (c.budget_max < bf.min || c.budget_min > bf.max) return false;
    return true;
  });

  return (
    <AppLayout>
      <SEOHead title="Brand Deals" description="Get paid for sponsored content opportunities" />
      <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
        <BackNav label="Brand Deal Marketplace" />
        <p className="text-sm text-muted-foreground mt-1">Get paid for what you create</p>

        <Tabs defaultValue="browse" className="mt-4">
          <TabsList><TabsTrigger value="browse">Browse</TabsTrigger><TabsTrigger value="applications">My Applications</TabsTrigger></TabsList>

          <TabsContent value="browse" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {["all", "sponsored_stream", "community_post", "newsletter_feature", "full_partnership"].map(t => (
                <Button key={t} size="sm" variant={typeFilter === t ? "default" : "outline"} onClick={() => setTypeFilter(t)}>
                  {t === "all" ? "All" : typeLabels[t]}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {budgetFilters.map((b, i) => (
                <Button key={b.label} size="sm" variant={budgetFilter === i ? "default" : "outline"} onClick={() => setBudgetFilter(i)}>{b.label}</Button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-48 rounded-xl skeleton" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12"><Briefcase className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-40" /><p className="text-sm text-muted-foreground">No campaigns match your filters</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((c: any) => {
                  const brand = c.brand_profiles;
                  const daysLeft = c.application_deadline ? differenceInDays(new Date(c.application_deadline), new Date()) : null;
                  return (
                    <Card key={c.id} className="border-border hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-10 h-10"><AvatarImage src={brand?.logo_url} /><AvatarFallback className="bg-primary/10 text-primary text-xs">{(brand?.company_name || "B")[0]}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{brand?.company_name}</p>
                            <Badge variant="outline" className="text-[10px]">{typeLabels[c.campaign_type]}</Badge>
                          </div>
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{c.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-primary">${c.budget_min}-${c.budget_max}</span>
                          {daysLeft !== null && daysLeft >= 0 && <Badge variant="outline" className="text-[10px]">{daysLeft}d left</Badge>}
                        </div>
                        {c.target_min_members > 0 && <p className="text-[10px] text-muted-foreground mt-1">Min {c.target_min_members} members required</p>}
                        <Button className="w-full mt-3" size="sm" onClick={() => { setApplyingId(c.id); setPitch(""); setProposedRate(""); }}>Apply →</Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="mt-4 space-y-3">
            {myApps.length === 0 ? (
              <div className="text-center py-12"><p className="text-sm text-muted-foreground">No applications yet</p></div>
            ) : myApps.map((app: any) => (
              <Card key={app.id} className="border-border"><CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{app.brand_campaigns?.title}</p>
                  <p className="text-xs text-muted-foreground">{app.brand_campaigns?.brand_profiles?.company_name}</p>
                </div>
                <Badge variant="outline">{app.status}</Badge>
              </CardContent></Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Apply Dialog */}
      <Dialog open={!!applyingId} onOpenChange={() => setApplyingId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Apply for Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Your pitch</label><Textarea value={pitch} onChange={e => setPitch(e.target.value)} placeholder="Why you're a great fit..." rows={4} /></div>
            <div><label className="text-xs text-muted-foreground">Proposed rate ($)</label><Input type="number" value={proposedRate} onChange={e => setProposedRate(e.target.value)} placeholder="Your rate" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyingId(null)}>Cancel</Button>
            <Button onClick={() => applyMut.mutate()} disabled={!pitch.trim() || applyMut.isPending}>
              {applyMut.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
