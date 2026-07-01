import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, Eye, Loader2, Sparkles } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function FunnelEditor() {
  const { pageId } = useParams<{ pageId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [content, setContent] = useState<Record<string, any>>({});
  const [isPublished, setIsPublished] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const LOW_BALANCE = 5;

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["wallet-credits", user?.id],
    enabled: !!user && aiOpen,
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("credits").eq("user_id", user!.id).maybeSingle();
      return { credits: data?.credits ?? 0 };
    },
  });
  const balance = wallet?.credits ?? 0;
  const isLow = balance < LOW_BALANCE;

  const { data: page, isLoading } = useQuery({
    queryKey: ["funnel-page", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_pages")
        .select("*")
        .eq("id", pageId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (page) {
      setContent((page.content as Record<string, any>) || {});
      setIsPublished(page.is_published || false);
    }
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("creator_pages")
        .update({ content, is_published: isPublished, updated_at: new Date().toISOString() })
        .eq("id", pageId!);
    },
    onSuccess: () => {
      toast.success("Page saved!");
      queryClient.invalidateQueries({ queryKey: ["funnel-page", pageId] });
    },
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-site-content", {
        body: { prompt: aiPrompt, pageType: page?.page_type || "lead_capture" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { content: Record<string, any>; credits_charged: number; credits_remaining: number };
    },
    onSuccess: (data) => {
      // Merge non-empty generated fields into existing content
      setContent(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data.content)) {
          if (v && (typeof v === "string" ? v.trim() : true)) next[k] = v;
        }
        return next;
      });
      toast.success(`Generated! −${data.credits_charged} credits (${data.credits_remaining} left)`);
      setAiOpen(false);
      setAiPrompt("");
    },
    onError: (err: Error) => {
      if (err.message === "insufficient_credits") {
        toast.error("Not enough credits. Top up to keep generating.");
      } else if (err.message === "rate_limited") {
        toast.error("Rate limited — try again in a moment.");
      } else {
        toast.error(err.message || "Generation failed");
      }
    },
  });

  const updateField = (key: string, value: any) => setContent(prev => ({ ...prev, [key]: value }));

  if (isLoading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;

  const pageType = page?.page_type || "lead_capture";

  return (
    <AppLayout>
      <BackNav label="Back to My Page" fallback="/my-page" />
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold capitalize">{pageType.replace("_", " ")} Editor</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Published</span>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
            <Button size="sm" variant="outline" onClick={() => setAiOpen(true)} className="gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>

        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI Generate</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Describe your page in a sentence — we'll draft the copy. Costs ~2 credits per generation.</p>
              <Textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. Landing page for my 6-week songwriting bootcamp, aimed at intermediate guitarists who want to release their first EP."
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAiOpen(false)}>Cancel</Button>
              <Button
                onClick={() => aiMutation.mutate()}
                disabled={aiMutation.isPending || aiPrompt.trim().length < 10}
                className="gap-1"
              >
                {aiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Headline</label>
              <Input value={content.headline || ""} onChange={e => updateField("headline", e.target.value)} placeholder="Your headline..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subheadline</label>
              <Input value={content.subheadline || ""} onChange={e => updateField("subheadline", e.target.value)} placeholder="Supporting text..." />
            </div>

            {pageType === "lead_capture" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Button Text</label>
                  <Input value={content.button_text || "Get Access"} onChange={e => updateField("button_text", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Success Message</label>
                  <Input value={content.success_message || "Thanks! Check your email."} onChange={e => updateField("success_message", e.target.value)} />
                </div>
              </>
            )}

            {pageType === "sales_page" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Benefits (one per line)</label>
                  <Textarea value={content.benefits || ""} onChange={e => updateField("benefits", e.target.value)} rows={4} placeholder="Benefit 1&#10;Benefit 2&#10;Benefit 3" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA Text</label>
                  <Input value={content.cta_text || "Join Now"} onChange={e => updateField("cta_text", e.target.value)} />
                </div>
              </>
            )}

            {pageType === "thank_you" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Next Steps (one per line)</label>
                  <Textarea value={content.next_steps || ""} onChange={e => updateField("next_steps", e.target.value)} rows={3} placeholder="Step 1&#10;Step 2&#10;Step 3" />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Body Content</label>
              <Textarea value={content.body || ""} onChange={e => updateField("body", e.target.value)} rows={6} placeholder="Write your page content..." />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
