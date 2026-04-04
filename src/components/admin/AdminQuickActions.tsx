import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Target, Zap, Pause, Search, RefreshCw, Download, Send } from "lucide-react";

export default function AdminQuickActions() {
  const [launchDialog, setLaunchDialog] = useState(false);
  const [launchInput, setLaunchInput] = useState("");
  const [launching, setLaunching] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pausing, setPausing] = useState(false);

  const handleLaunch = () => {
    if (launchInput !== "LAUNCH UPLY") return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          executeLaunch();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeLaunch = async () => {
    setLaunching(true);
    const { error } = await supabase.from("launch_config").update({ is_launched: true }).neq("id", "");
    if (error) toast.error("Error", { description: error.message });
    else toast.success("🚀 Platform Launched!", { description: "UPLY is now live." });
    setLaunching(false);
    setLaunchDialog(false);
    setLaunchInput("");
    setCountdown(null);
  };

  const handlePause = async () => {
    setPausing(true);
    const { error } = await supabase.from("launch_config").update({ is_launched: false }).neq("id", "");
    if (error) toast.error("Error", { description: error.message });
    else toast.success("⏸️ Platform Paused", { description: "Waitlist mode re-enabled." });
    setPausing(false);
  };

  const handleExport = async (type: string) => {
    toast.success("Exporting ${type}...", { description: "Download will start shortly." });
    // In production, this would call an edge function to generate the CSV
  };

  const actions = [
    { icon: Target, label: "Grant Early Access", emoji: "🎯", onClick: () => toast.success("Search waitlist to grant access") },
    { icon: Zap, label: "Launch Platform", emoji: "⚡", onClick: () => setLaunchDialog(true) },
    { icon: Pause, label: "Emergency Pause", emoji: "⏸️", onClick: handlePause, variant: "destructive" as const },
    { icon: Search, label: "View User", emoji: "👤", onClick: () => toast.success("Search users by email or username") },
    { icon: Download, label: "Export Data", emoji: "📊", onClick: () => handleExport("Waitlist CSV") },
  ];

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {actions.map((a) => (
            <Button
              key={a.label}
              variant={a.variant || "outline"}
              size="sm"
              className="shrink-0 gap-1.5 text-xs"
              onClick={a.onClick}
            >
              {a.emoji} {a.label}
            </Button>
          ))}
        </div>
      </div>

      <Dialog open={launchDialog} onOpenChange={setLaunchDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg">⚡ Launch UPLY</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will set the platform live and notify all waitlist applicants. Type{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold">LAUNCH UPLY</code> to confirm.
          </p>
          <Input
            value={launchInput}
            onChange={(e) => setLaunchInput(e.target.value)}
            placeholder="Type LAUNCH UPLY"
            className="bg-background"
          />
          {countdown !== null && (
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-primary">{countdown}</p>
              <p className="text-xs text-muted-foreground">seconds until launch</p>
              <Button variant="destructive" size="sm" className="mt-2" onClick={() => { setCountdown(null); setLaunchInput(""); }}>
                Cancel
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={launchInput !== "LAUNCH UPLY" || launching || countdown !== null}
              onClick={handleLaunch}
              className="w-full"
            >
              {launching ? "Launching..." : "🚀 Launch Platform"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
