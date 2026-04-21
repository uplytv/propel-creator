import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Mail, Copy, Check, Share2, Download, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { buildGrowthPlan, buildPlanText, downloadIcs } from "@/lib/growthPlan";
import { toast } from "sonner";

export default function ShareGrowthPlanModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { profile } = useApp();
  const plan = useMemo(() => buildGrowthPlan(profile), [profile, open]);
  const planText = useMemo(() => buildPlanText(plan), [plan]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(planText);
      setCopied(true);
      toast.success("Plan copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — try selecting and copying manually");
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`${plan.creatorName}'s UPLY Growth Plan`);
    const body = encodeURIComponent(planText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${plan.creatorName}'s Growth Plan`,
          text: planText,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleDownload = () => {
    downloadIcs(plan);
    toast.success("Calendar file downloaded — import it to Google, Apple, or Outlook Calendar");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle>Share your growth plan</DialogTitle>
          </div>
          <DialogDescription>
            Personalized for {plan.creatorName} — KPIs, weekly cadence, milestones, and your next 3 actions.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="calendar" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="calendar"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Calendar</TabsTrigger>
            <TabsTrigger value="email"><Mail className="w-3.5 h-3.5 mr-1.5" /> Email</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Download an <strong>.ics</strong> file with your weekly cadence (daily clips, weekly lives & newsletters)
              and dated milestones. Import into Google Calendar, Apple Calendar, or Outlook in one click.
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1.5">
              <p>📅 <strong>{plan.weeklyTasks.length}</strong> recurring habits (next 30 days)</p>
              <p>🎯 <strong>{plan.milestones.length}</strong> dated milestones</p>
              <p>⏱️ Pre-scheduled at sensible times (9am clips, 7pm lives, 10am newsletters)</p>
            </div>
            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="w-4 h-4" /> Download .ics calendar file
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Open your default email app with the plan pre-filled — share with your team, manager, or accountability partner.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleEmail} variant="default" className="gap-2">
                <Mail className="w-4 h-4" /> Open in email
              </Button>
              <Button onClick={handleCopy} variant="secondary" className="gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy text"}
              </Button>
            </div>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button onClick={handleNativeShare} variant="ghost" className="w-full gap-2">
                <Share2 className="w-4 h-4" /> Share via…
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              Branded sender domain (your-name@yourdomain.com) coming next — for now this uses your default mail client.
            </p>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono bg-muted/30 border border-border rounded-lg p-3 max-h-[400px] overflow-y-auto">
              {planText}
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
