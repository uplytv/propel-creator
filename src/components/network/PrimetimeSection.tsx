import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNetwork } from "@/context/NetworkContext";
import { useAuth } from "@/context/AuthContext";
import { PrimetimeSkeleton } from "./NetworkSkeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function CountdownTimer({ targetDate, onComplete }: { targetDate: string; onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { onComplete(); return; }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate, onComplete]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center justify-center gap-3">
      {[
        { val: timeLeft.hours, label: "HRS" },
        { val: timeLeft.minutes, label: "MIN" },
        { val: timeLeft.seconds, label: "SEC" },
      ].map((t) => (
        <div key={t.label} className="text-center">
          <div className="text-4xl font-extrabold text-foreground font-heading">{pad(t.val)}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function PrimetimeSection() {
  const { liveStreams, scheduledStreams, recentRecordings, isLoading, refetch } = useNetwork();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminded, setReminded] = useState(false);

  if (isLoading) return <PrimetimeSkeleton />;

  // Priority 1: Live streams
  if (liveStreams.length > 0) {
    const featured = liveStreams[0];
    return (
      <div
        className="rounded-lg border border-border overflow-hidden"
        style={{ borderLeft: "4px solid hsl(var(--primary))", background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)" }}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider font-heading">🔴 Primetime</span>
          <span className="text-[11px] text-muted-foreground">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="relative" style={{ aspectRatio: "16/9" }}>
          <img
            src={featured.playback_id ? `https://image.mux.com/${featured.playback_id}/thumbnail.jpg?width=640` : "/placeholder.svg"}
            alt={featured.title || "Live stream"}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">LIVE</span>
          {featured.viewer_count > 0 && (
            <span className="absolute bottom-3 right-3 bg-background/80 text-foreground text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
              👁 {featured.viewer_count}
            </span>
          )}
        </div>
        <div className="p-4 space-y-3">
          <p className="text-lg font-bold text-foreground font-heading">{featured.title || "Untitled Stream"}</p>
          <Button className="w-full h-12 bg-primary text-primary-foreground font-bold" onClick={() => navigate(`/stream/${featured.id}`)}>
            Watch Now
          </Button>
        </div>
      </div>
    );
  }

  // Priority 2: Scheduled streams countdown
  if (scheduledStreams.length > 0) {
    const next = scheduledStreams[0];
    const handleRemind = async () => {
      if (!user) { navigate("/auth"); return; }
      const { error } = await (supabase.from("stream_reminders") as any).insert({ stream_id: next.id, user_id: user.id }).select().single();
      if (!error) { setReminded(true); toast.success("You'll be reminded 15 min before!"); }
    };

    return (
      <div className="rounded-lg p-6 text-center space-y-4" style={{ border: "2px solid hsl(var(--primary)/0.4)", boxShadow: "0 0 20px hsl(var(--primary)/0.15)" }}>
        <p className="text-lg font-bold text-foreground font-heading">{next.title || "Upcoming Stream"}</p>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Starting In</p>
        <CountdownTimer targetDate={next.scheduled_at} onComplete={refetch} />
        <Button className="w-full h-12 bg-primary text-primary-foreground font-bold" onClick={handleRemind} disabled={reminded}>
          {reminded ? "✓ Reminded" : "Set Reminder"}
        </Button>
      </div>
    );
  }

  // Priority 3: Recent recordings
  if (recentRecordings.length > 0) {
    const rec = recentRecordings[0];
    return (
      <div className="rounded-lg border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <div className="relative" style={{ aspectRatio: "16/9" }}>
          <img
            src={rec.playback_id ? `https://image.mux.com/${rec.playback_id}/thumbnail.jpg?width=640` : "/placeholder.svg"}
            alt={rec.title || "Recording"}
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-3 left-3 bg-background/80 text-foreground text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-sm">
            Watch Again
          </span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-base font-bold text-foreground font-heading">{rec.title || "Recent Stream"}</p>
          <p className="text-[13px] text-muted-foreground">
            {rec.view_count || 0} views · {new Date(rec.created_at).toLocaleDateString()}
          </p>
          <Button className="w-full h-12 bg-primary text-primary-foreground font-bold" onClick={() => navigate(`/stream/${rec.id}`)}>
            Watch Now
          </Button>
        </div>
      </div>
    );
  }

  // Priority 4: Empty state CTA
  return (
    <div className="rounded-lg p-8 text-center space-y-4" style={{ border: "2px solid hsl(var(--primary)/0.4)" }}>
      <p className="text-[12px] text-muted-foreground uppercase tracking-wider">📺 UPLY Primetime</p>
      <p className="text-base font-semibold text-foreground">No one is live right now.</p>
      <Button
        className="w-full h-12 bg-primary text-primary-foreground font-bold"
        onClick={() => navigate(user ? "/go-live" : "/waitlist")}
      >
        Go Live First Tonight →
      </Button>
      <p className="text-[12px] text-muted-foreground">Be the creator everyone watches tonight.</p>
    </div>
  );
}
