import { useState, useEffect, useCallback } from "react";
import { Mail, Plus, Send, Eye, Clock, Check, AlertCircle, Loader2, Save } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import { format } from "date-fns";

const statusConfig: Record<string, { color: string; icon: typeof Check }> = {
  draft: { color: "bg-muted text-muted-foreground", icon: Clock },
  scheduled: { color: "bg-blue-500/10 text-blue-400", icon: Clock },
  sending: { color: "bg-yellow-500/10 text-yellow-400", icon: Loader2 },
  sent: { color: "bg-primary/10 text-primary", icon: Check },
  failed: { color: "bg-destructive/10 text-destructive", icon: AlertCircle },
};

export default function Newsletter() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [recipientType, setRecipientType] = useState("all_members");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const profileId = profile?.id;

  const { data: newsletters = [], isLoading } = useQuery({
    queryKey: ["newsletters", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("creator_newsletters").select("*").eq("creator_id", profileId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profileId,
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["member-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("community_members").select("*", { count: "exact", head: true }).eq("creator_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const selected = newsletters.find((n: any) => n.id === selectedId);

  useEffect(() => {
    if (selected) {
      setSubject(selected.subject || "");
      setPreviewText(selected.preview_text || "");
      setHtmlContent(selected.html_content || "");
      setRecipientType(selected.recipient_type || "all_members");
    }
  }, [selectedId]);

  const saveDraft = useCallback(async () => {
    if (!selectedId || !profileId) return;
    setSaving(true);
    await supabase.from("creator_newsletters").update({
      subject, preview_text: previewText, html_content: htmlContent, recipient_type: recipientType, updated_at: new Date().toISOString(),
    }).eq("id", selectedId);
    setLastSaved(new Date());
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["newsletters"] });
  }, [selectedId, subject, previewText, htmlContent, recipientType, profileId, qc]);

  // Auto-save every 30s
  useEffect(() => {
    if (!selectedId || !selected || selected.status !== "draft") return;
    const t = setInterval(saveDraft, 30000);
    return () => clearInterval(t);
  }, [selectedId, saveDraft, selected]);

  const createDraft = async () => {
    if (!profileId) return;
    const { data, error } = await supabase.from("creator_newsletters").insert({ creator_id: profileId, title: "Untitled Newsletter", subject: "", status: "draft" }).select().single();
    if (data) { setSelectedId(data.id); qc.invalidateQueries({ queryKey: ["newsletters"] }); }
  };

  const sendMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-newsletter", { body: { newsletter_id: selectedId } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Newsletter sent!", { description: `Sent to ${data.sent} subscribers` });
      qc.invalidateQueries({ queryKey: ["newsletters"] });
      setConfirmSend(false);
    },
    onError: (err: any) => toast.error("Send failed", { description: err.message }),
  });

  return (
    <AppLayout>
      <SEOHead title="Newsletter" description="Email your community members" />
      <div className="max-w-6xl mx-auto px-4 py-4 pb-24">
        <BackNav label="Newsletter" />

        <div className="mt-4 flex flex-col lg:flex-row gap-4">
          {/* Left - Newsletter list */}
          <div className="w-full lg:w-60 shrink-0">
            <Button onClick={createDraft} className="w-full mb-3" size="sm">
              <Plus className="w-4 h-4 mr-1" /> New Newsletter
            </Button>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg skeleton" />)}</div>
              ) : newsletters.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                  <p className="text-sm text-muted-foreground">No newsletters yet</p>
                </div>
              ) : (
                newsletters.map((nl: any) => {
                  const cfg = statusConfig[nl.status] || statusConfig.draft;
                  return (
                    <button
                      key={nl.id}
                      onClick={() => setSelectedId(nl.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedId === nl.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80 bg-card"}`}
                    >
                      <p className="text-sm font-medium truncate">{nl.subject || "Untitled"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{nl.status}</Badge>
                        {nl.recipient_count > 0 && <span className="text-[10px] text-muted-foreground">{nl.recipient_count} sent</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Center - Composer */}
          <div className="flex-1 min-w-0">
            {!selectedId ? (
              <Card className="border-border"><CardContent className="py-16 text-center">
                <Mail className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-muted-foreground">Select a newsletter or create a new one</p>
              </CardContent></Card>
            ) : (
              <Card className="border-border">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Subject line</label>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line..." className="text-lg font-semibold" maxLength={200} disabled={selected?.status !== "draft"} />
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">{subject.length}/200</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Preview text</label>
                    <Input value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Preview text shown in inbox..." maxLength={150} disabled={selected?.status !== "draft"} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Content</label>
                    <Textarea value={htmlContent} onChange={e => setHtmlContent(e.target.value)} placeholder="Write your newsletter content..." rows={12} className="min-h-[200px]" disabled={selected?.status !== "draft"} />
                  </div>
                  {selected?.status === "draft" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</> : lastSaved ? <><Save className="w-3 h-3" /> Saved {format(lastSaved, "h:mm a")}</> : null}
                    </div>
                  )}
                  {selected?.status === "sent" && (
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                      <div className="text-center"><p className="text-lg font-bold text-foreground">{selected.recipient_count}</p><p className="text-[10px] text-muted-foreground">Sent</p></div>
                      <div className="text-center"><p className="text-lg font-bold text-foreground">{selected.open_count}</p><p className="text-[10px] text-muted-foreground">Opens</p></div>
                      <div className="text-center"><p className="text-lg font-bold text-foreground">{selected.click_count}</p><p className="text-[10px] text-muted-foreground">Clicks</p></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right - Settings */}
          {selectedId && selected?.status === "draft" && (
            <div className="w-full lg:w-[280px] shrink-0 space-y-3">
              <Card className="border-border"><CardContent className="p-4">
                <label className="text-xs text-muted-foreground mb-2 block">Recipients</label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_members">All Members</SelectItem>
                    <SelectItem value="paid_members">Paid Only</SelectItem>
                    <SelectItem value="free_members">Free Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">{memberCount} eligible members</p>
              </CardContent></Card>

              <Button variant="outline" className="w-full" onClick={() => setPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-1" /> Preview Email
              </Button>
              <Button onClick={saveDraft} variant="outline" className="w-full" disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> Save Draft
              </Button>
              <Button className="w-full" onClick={() => setConfirmSend(true)} disabled={!subject.trim()}>
                <Send className="w-4 h-4 mr-1" /> Send Now
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
          <div className="bg-background rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <img src={profile?.avatar_url || "/favicon.png"} className="w-10 h-10 rounded-full object-cover" alt={profile?.display_name || ""} loading="lazy" />
              <div>
                <p className="font-semibold text-sm">{profile?.display_name}</p>
                <p className="text-xs text-muted-foreground">via UPLY</p>
              </div>
            </div>
            <h2 className="text-lg font-bold mb-2">{subject || "Subject line"}</h2>
            <div className="text-sm text-foreground whitespace-pre-wrap">{htmlContent || "Newsletter content will appear here..."}</div>
            <div className="mt-6 pt-4 border-t border-border text-center">
              <p className="text-[10px] text-muted-foreground">You received this because you're a member of {profile?.display_name}'s community on UPLY.<br />Unsubscribe</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Send */}
      <Dialog open={confirmSend} onOpenChange={setConfirmSend}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Newsletter?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Sending to {memberCount} members — this cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSend(false)}>Cancel</Button>
            <Button onClick={() => sendMut.mutate()} disabled={sendMut.isPending}>
              {sendMut.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
