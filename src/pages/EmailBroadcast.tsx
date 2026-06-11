import { useState } from "react";
import { Send, Mail, Users, Loader2, Check, AlertCircle, ArrowLeft, Clock, Eye, MousePointerClick, Beaker, Tag, CalendarClock, FileText, Calendar } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/email/RichTextEditor";
import EmailPreview from "@/components/email/EmailPreview";
import EmailTemplateLibrary from "@/components/email/EmailTemplateLibrary";
import MergeTagHelper from "@/components/email/MergeTagHelper";
import BroadcastCalendar from "@/components/email/BroadcastCalendar";
import SmartSendTime from "@/components/email/SmartSendTime";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const statusBadge: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-muted text-muted-foreground", label: "Draft" },
  scheduled: { color: "bg-blue-500/10 text-blue-400", label: "Scheduled" },
  sending: { color: "bg-yellow-500/10 text-yellow-400", label: "Sending" },
  sent: { color: "bg-primary/10 text-primary", label: "Sent" },
  failed: { color: "bg-destructive/10 text-destructive", label: "Failed" },
};

export default function EmailBroadcast() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [composing, setComposing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Scheduling
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // A/B Testing
  const [abEnabled, setAbEnabled] = useState(false);
  const [subjectB, setSubjectB] = useState("");
  const [abTestSize, setAbTestSize] = useState(20);
  const [bodyB, setBodyB] = useState("");

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["email-broadcasts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_broadcasts")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Get available tags from subscribers
  const { data: availableTags = [] } = useQuery({
    queryKey: ["subscriber-tags", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscribers")
        .select("tags")
        .eq("creator_id", user!.id)
        .eq("unsubscribed", false);
      const tagSet = new Set<string>();
      (data || []).forEach((s: any) => {
        (s.tags || []).forEach((t: string) => tagSet.add(t));
      });
      return Array.from(tagSet).sort();
    },
    enabled: !!user,
  });

  // Subscribers for smart send-time
  const { data: subscribersForSendTime = [] } = useQuery({
    queryKey: ["subscribers-send-time", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscribers")
        .select("optimal_send_hour, send_hour_data")
        .eq("creator_id", user!.id)
        .eq("unsubscribed", false);
      return (data || []) as Array<{ optimal_send_hour?: number | null; send_hour_data?: any }>;
    },
    enabled: !!user,
  });

  const { data: subCount = 0 } = useQuery({
    queryKey: ["subscriber-count-for-broadcast", user?.id, segment, tagFilter],
    queryFn: async () => {
      let query = supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user!.id)
        .eq("unsubscribed", false);

      if (segment === "members") query = query.eq("source", "membership");
      else if (segment === "free") query = query.neq("source", "membership");
      else if (segment !== "all") query = query.eq("source", segment);

      if (tagFilter) query = query.contains("tags", [tagFilter]);

      const { count } = await query;
      return count || 0;
    },
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const isScheduled = scheduleEnabled && scheduledDate && scheduledTime;
      const scheduledAt = isScheduled
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      if (abEnabled && subjectB.trim()) {
        // Create A/B test: two broadcasts + parent
        const { data: parentBroadcast, error: parentErr } = await supabase
          .from("email_broadcasts")
          .insert({
            creator_id: user!.id,
            subject: `A/B: ${subject}`,
            body,
            segment,
            status: isScheduled ? "scheduled" : "sending",
            total_recipients: subCount,
            scheduled_at: scheduledAt,
            ab_variant_a: subject,
            ab_variant_b: subjectB,
            ab_body_b: bodyB.trim() || null,
            ab_test_size: abTestSize,
          })
          .select()
          .single();

        if (parentErr) throw parentErr;

        if (!isScheduled) {
          // Fetch all recipients
          let query = supabase
            .from("subscribers")
            .select("email, name")
            .eq("creator_id", user!.id)
            .eq("unsubscribed", false);

          if (segment === "members") query = query.eq("source", "membership");
          else if (segment === "free") query = query.neq("source", "membership");
          else if (segment !== "all") query = query.eq("source", segment);
          if (tagFilter) query = query.contains("tags", [tagFilter]);

          const { data: allRecipients } = await query;
          if (!allRecipients?.length) throw new Error("No recipients found");

          // Split test group
          const testCount = Math.max(2, Math.floor(allRecipients.length * (abTestSize / 100)));
          const shuffled = [...allRecipients].sort(() => Math.random() - 0.5);
          const testGroup = shuffled.slice(0, testCount);
          const halfTest = Math.ceil(testCount / 2);
          const groupA = testGroup.slice(0, halfTest);
          const groupB = testGroup.slice(halfTest);

          // Send variant A
          const { data: bA } = await supabase.from("email_broadcasts")
            .insert({ creator_id: user!.id, subject, body, segment, status: "sending", total_recipients: groupA.length, ab_parent_id: parentBroadcast.id })
            .select().single();

          await supabase.functions.invoke("send-email-broadcast", {
            body: {
              broadcastId: bA!.id, subject, htmlBody: body,
              recipients: groupA.map(r => ({ email: r.email, name: r.name })),
              creatorName: profile?.display_name || "Creator", creatorAvatar: profile?.avatar_url,
            },
          });

          // Send variant B
          const variantBBody = bodyB.trim() || body;
          const { data: bB } = await supabase.from("email_broadcasts")
            .insert({ creator_id: user!.id, subject: subjectB, body: variantBBody, segment, status: "sending", total_recipients: groupB.length, ab_parent_id: parentBroadcast.id })
            .select().single();

          await supabase.functions.invoke("send-email-broadcast", {
            body: {
              broadcastId: bB!.id, subject: subjectB, htmlBody: variantBBody,
              recipients: groupB.map(r => ({ email: r.email, name: r.name })),
              creatorName: profile?.display_name || "Creator", creatorAvatar: profile?.avatar_url,
            },
          });

          // Update parent with info
          await supabase.from("email_broadcasts")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", parentBroadcast.id);
        }
      } else {
        // Normal broadcast
        const { data: broadcast, error: insertErr } = await supabase
          .from("email_broadcasts")
          .insert({
            creator_id: user!.id,
            subject,
            body,
            segment,
            status: isScheduled ? "scheduled" : "sending",
            total_recipients: subCount,
            scheduled_at: scheduledAt,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        if (!isScheduled) {
          let query = supabase
            .from("subscribers")
            .select("email, name")
            .eq("creator_id", user!.id)
            .eq("unsubscribed", false);

          if (segment === "members") query = query.eq("source", "membership");
          else if (segment === "free") query = query.neq("source", "membership");
          else if (segment !== "all") query = query.eq("source", segment);
          if (tagFilter) query = query.contains("tags", [tagFilter]);

          const { data: recipients } = await query;
          if (!recipients?.length) throw new Error("No recipients found");

          const { error: sendErr } = await supabase.functions.invoke("send-email-broadcast", {
            body: {
              broadcastId: broadcast.id,
              subject,
              htmlBody: body,
              recipients: recipients.map(r => ({ email: r.email, name: r.name })),
              creatorName: profile?.display_name || "Creator",
              creatorAvatar: profile?.avatar_url,
            },
          });

          if (sendErr) throw sendErr;
        }
      }
    },
    onSuccess: () => {
      toast.success(scheduleEnabled ? "Broadcast scheduled!" : abEnabled ? "A/B test sent!" : "Broadcast sent!");
      setComposing(false);
      setSubject("");
      setSubjectB("");
      setBodyB("");
      setBody("");
      setConfirmSend(false);
      setScheduleEnabled(false);
      setAbEnabled(false);
      qc.invalidateQueries({ queryKey: ["email-broadcasts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send broadcast");
    },
  });

  return (
    <AppLayout>
      <SEOHead title="Email Broadcast | UPLY" description="Send emails to your subscribers" />
      <div className="min-h-screen pb-24">
        <BackNav label="Email Broadcast" />

        {composing ? (
          <div className="px-4 space-y-4">
            <button onClick={() => setComposing(false)} className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to broadcasts
            </button>

            <div className="space-y-3">
              {/* Segment */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Send to</label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="members">Members Only</SelectItem>
                    <SelectItem value="free">Free Subscribers</SelectItem>
                    <SelectItem value="stream_join">Stream Viewers</SelectItem>
                    <SelectItem value="rsvp">Event RSVPs</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{subCount} recipient{subCount !== 1 ? "s" : ""}</p>
              </div>

              {/* Tag filter */}
              {availableTags.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    <Tag className="w-3 h-3 inline mr-1" />Filter by tag
                  </label>
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="All tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All tags</SelectItem>
                      {availableTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Merge Tags */}
              <MergeTagHelper />

              {/* Smart Send Time */}
              <SmartSendTime
                subscribers={subscribersForSendTime}
                onSelectHour={(hour) => {
                  setScheduleEnabled(true);
                  if (!scheduledDate) setScheduledDate(new Date().toISOString().split("T")[0]);
                  setScheduledTime(`${hour.toString().padStart(2, "0")}:00`);
                }}
              />


              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Subject {abEnabled && "(Variant A)"}
                </label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Email subject line..."
                  className="rounded-xl"
                />
              </div>


              {/* Template Library Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                className="w-full rounded-xl gap-2 text-xs"
              >
                <FileText className="w-3.5 h-3.5" /> {showTemplates ? "Hide Templates" : "Use a Template"}
              </Button>

              {showTemplates && (
                <div className="p-3 rounded-xl border border-border bg-card/50">
                  <EmailTemplateLibrary
                    onUseTemplate={(tmplSubject, tmplBody) => {
                      setSubject(tmplSubject);
                      setBody(tmplBody);
                      setShowTemplates(false);
                      toast.success("Template applied");
                    }}
                  />
                </div>
              )}

              {/* Body */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Body</label>
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  placeholder="Write your email content..."
                />
              </div>

              {/* Schedule toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Schedule for later</span>
                </div>
                <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
              </div>

              {scheduleEnabled && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="rounded-xl flex-1"
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="rounded-xl w-32"
                  />
                </div>
              )}

              {/* A/B toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">A/B test</span>
                </div>
                <Switch checked={abEnabled} onCheckedChange={setAbEnabled} />
              </div>

              {abEnabled && (
                <div className="space-y-3 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject (Variant B)</label>
                    <Input
                      value={subjectB}
                      onChange={e => setSubjectB(e.target.value)}
                      placeholder="Alternative subject line..."
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Body (Variant B) — optional</label>
                    <RichTextEditor
                      value={bodyB}
                      onChange={setBodyB}
                      placeholder="Leave empty to use same body as A..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Test size:</label>
                    <Select value={abTestSize.toString()} onValueChange={v => setAbTestSize(Number(v))}>
                      <SelectTrigger className="w-24 h-8 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                        <SelectItem value="30">30%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] text-muted-foreground">of list gets test, winner goes to rest</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  disabled={!subject.trim() && !body.trim()}
                  className="rounded-xl gap-2 flex-1"
                >
                  <Eye className="w-4 h-4" /> Preview
                </Button>
                <Button
                  onClick={() => setConfirmSend(true)}
                  disabled={!subject.trim() || !body.trim() || subCount === 0 || (scheduleEnabled && (!scheduledDate || !scheduledTime)) || (abEnabled && !subjectB.trim())}
                  className="rounded-xl gap-2 flex-1"
                  style={{ background: "#3D7CFF", color: "#0A0A0A" }}
                >
                  {scheduleEnabled ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {scheduleEnabled ? "Schedule" : `Send to ${subCount}`}
                </Button>
              </div>

              <EmailPreview
                open={showPreview}
                onOpenChange={setShowPreview}
                subject={subject}
                htmlBody={body}
                creatorName={profile?.display_name || "Creator"}
                creatorAvatar={profile?.avatar_url}
              />
            </div>

            <Dialog open={confirmSend} onOpenChange={setConfirmSend}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{scheduleEnabled ? "Confirm Schedule" : abEnabled ? "Confirm A/B Test" : "Confirm Send"}</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground space-y-2">
                  {abEnabled ? (
                    <>
                      <p>A/B test with {abTestSize}% of {subCount} subscribers:</p>
                      <p>• <strong>A:</strong> {subject}</p>
                      <p>• <strong>B:</strong> {subjectB}</p>
                    </>
                  ) : (
                    <p>Send "<strong>{subject}</strong>" to <strong>{subCount}</strong> subscribers{scheduleEnabled && scheduledDate ? ` on ${format(new Date(`${scheduledDate}T${scheduledTime || "00:00"}`), "MMM d, yyyy 'at' h:mm a")}` : ""}?</p>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setConfirmSend(false)}>Cancel</Button>
                  <Button
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                    style={{ background: "#3D7CFF", color: "#0A0A0A" }}
                  >
                    {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : scheduleEnabled ? "Schedule" : "Send Now"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="px-4 space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => setComposing(true)} className="flex-1 rounded-xl gap-2" style={{ background: "#3D7CFF", color: "#0A0A0A" }}>
                <Mail className="w-4 h-4" /> New Broadcast
              </Button>
              <Button
                variant={showCalendar ? "default" : "outline"}
                onClick={() => setShowCalendar(!showCalendar)}
                className="rounded-xl gap-1.5"
              >
                <Calendar className="w-4 h-4" /> {showCalendar ? "List" : "Calendar"}
              </Button>
            </div>

            {showCalendar && broadcasts.length > 0 && (
              <BroadcastCalendar broadcasts={broadcasts as any} />
            )}

            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : broadcasts.length === 0 ? (
              <div className="text-center py-16">
                <Send className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No broadcasts yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create your first email broadcast</p>
              </div>
            ) : (
              broadcasts.filter((b: any) => !b.ab_parent_id).map((b: any) => {
                const status = statusBadge[b.status] || statusBadge.draft;
                const isAB = b.ab_variant_a && b.ab_variant_b;
                return (
                  <div key={b.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground truncate">{b.subject}</h3>
                      <div className="flex gap-1.5">
                        {isAB && <Badge className="bg-purple-500/10 text-purple-400 text-[10px]">A/B</Badge>}
                        <Badge className={`${status.color} text-[10px]`}>{status.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span><Users className="w-3 h-3 inline mr-1" />{b.total_recipients || 0}</span>
                      {b.delivered_count > 0 && <span><Check className="w-3 h-3 inline mr-1" />{b.delivered_count}</span>}
                      {b.failed_count > 0 && <span><AlertCircle className="w-3 h-3 inline mr-1" />{b.failed_count}</span>}
                      {(b.open_count || 0) > 0 && (
                        <span className="text-blue-400"><Eye className="w-3 h-3 inline mr-1" />{b.open_count} opens</span>
                      )}
                      {(b.click_count || 0) > 0 && (
                        <span style={{ color: "#3D7CFF" }}><MousePointerClick className="w-3 h-3 inline mr-1" />{b.click_count} clicks</span>
                      )}
                    </div>
                    {b.scheduled_at && b.status === "scheduled" && (
                      <p className="text-[10px] text-blue-400">
                        <Clock className="w-3 h-3 inline mr-1" />Scheduled: {format(new Date(b.scheduled_at), "MMM d, yyyy h:mm a")}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {b.sent_at ? format(new Date(b.sent_at), "MMM d, yyyy h:mm a") : format(new Date(b.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
