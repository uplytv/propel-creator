import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Bell, Users, Radio, Share2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import SharePanel from "@/components/share/SharePanel";

interface ScheduledStream {
  id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  creator_id: string;
  status: string;
}

export default function StreamCountdownPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stream, setStream] = useState<ScheduledStream | null>(null);
  const [creator, setCreator] = useState<{ display_name: string; avatar_url: string | null; username: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminded, setReminded] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [shareOpen, setShareOpen] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);

  useEffect(() => {
    const fetchStream = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('scheduled_streams' as any)
        .select('*')
        .eq('id', id)
        .single();
      if (data) {
        setStream(data as any);
        // Get creator profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, username')
          .eq('user_id', (data as any).creator_id)
          .single();
        if (profile) setCreator(profile);

        // Get reminder count
        const { count } = await supabase
          .from('stream_reminders' as any)
          .select('*', { count: 'exact', head: true })
          .eq('scheduled_stream_id', id);
        setReminderCount(count || 0);
      }
      setLoading(false);
    };
    fetchStream();
  }, [id]);

  // Check if user has set a reminder
  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('stream_reminders' as any)
      .select('id')
      .eq('scheduled_stream_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setReminded(!!data));
  }, [user, id]);

  // Countdown timer
  useEffect(() => {
    if (!stream) return;
    const target = new Date(stream.scheduled_at).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });

      // If stream has started, redirect
      if (diff <= 0 && stream.status === 'live') {
        navigate(`/stream/${stream.id}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stream, navigate]);

  const toggleReminder = async () => {
    if (!user || !id) {
      toast.success("Sign in to set a reminder");
      return;
    }

    if (reminded) {
      await supabase
        .from('stream_reminders' as any)
        .delete()
        .eq('scheduled_stream_id', id)
        .eq('user_id', user.id);
      setReminded(false);
      setReminderCount(prev => prev - 1);
      toast.success("Reminder removed");
    } else {
      await supabase
        .from('stream_reminders' as any)
        .insert({ scheduled_stream_id: id, user_id: user.id });
      setReminded(true);
      setReminderCount(prev => prev + 1);
      toast.success("🔔 Reminder set! We'll notify you before the stream starts.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground">Stream not found</h2>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/live')}>
            Browse Streams
          </Button>
        </div>
      </div>
    );
  }

  const isLive = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  const scheduledDate = new Date(stream.scheduled_at);

  const countdownBlocks = [
    { value: timeLeft.days, label: 'DAYS' },
    { value: timeLeft.hours, label: 'HOURS' },
    { value: timeLeft.minutes, label: 'MIN' },
    { value: timeLeft.seconds, label: 'SEC' },
  ];

  return (
    <>
      <SEOHead
        title={`${stream.title} — Live Stream Countdown`}
        description={`${creator?.display_name} is going live! Join the stream on ${scheduledDate.toLocaleDateString()}.`}
      />

      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          {/* Creator info */}
          <div>
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-primary">
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} alt={creator.display_name || ""} className="w-full h-full rounded-full object-cover" loading="lazy" />
              ) : (
                creator?.display_name?.[0] || '?'
              )}
            </div>
            <p className="text-sm text-muted-foreground">{creator?.display_name}</p>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{stream.title}</h1>
            {stream.description && (
              <p className="text-sm text-muted-foreground">{stream.description}</p>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{scheduledDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <span>at {scheduledDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Countdown */}
          {!isLive ? (
            <div className="flex justify-center gap-3">
              {countdownBlocks.map((block, i) => (
                <motion.div
                  key={block.label}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring' }}
                  className="w-16 h-20 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center"
                >
                  <span className="text-2xl font-bold text-foreground font-mono">
                    {block.value.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[8px] text-muted-foreground tracking-widest">{block.label}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => navigate(`/stream/${stream.id}`)}
              >
                <Radio className="w-5 h-5 mr-2 animate-pulse" />
                Join Live Now!
              </Button>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button
              variant={reminded ? "default" : "outline"}
              size="lg"
              onClick={toggleReminder}
              className="flex-1"
            >
              <Bell className={`w-4 h-4 mr-2 ${reminded ? 'fill-current' : ''}`} />
              {reminded ? 'Reminded' : 'Remind Me'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShareOpen(true)}
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{reminderCount} {reminderCount === 1 ? 'person' : 'people'} waiting</span>
          </div>
        </motion.div>
      </div>

      <SharePanel
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        contentType="stream"
        contentId={stream.id}
        title={stream.title}
        creatorUsername={creator?.username}
      />
    </>
  );
}
