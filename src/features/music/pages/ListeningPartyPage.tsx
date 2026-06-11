import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, Send, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  useParty,
  useUpdatePartyState,
  useEndParty,
  useJoinParty,
  useLeaveParty,
  usePartyChat,
} from '../hooks/useListeningParties';
import { toast } from 'sonner';

const MAX_DRIFT = 2.0; // seconds

export function ListeningPartyPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const { data: party } = useParty(partyId);
  const updateState = useUpdatePartyState();
  const endParty = useEndParty();
  const join = useJoinParty(partyId);
  const leave = useLeaveParty(partyId);
  const { messages, send } = usePartyChat(partyId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // Join on mount, leave on unmount
  useEffect(() => {
    if (!partyId || !me) return;
    join.mutate();
    return () => {
      leave.mutate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, me]);

  const isHost = !!me && !!party && me === party.host_id;

  // Sync follower playback to host state
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !party || isHost) return;
    if (party.current_track_url && a.src !== party.current_track_url) {
      a.src = party.current_track_url;
    }
    const elapsed = (Date.now() - new Date(party.last_sync_at).getTime()) / 1000;
    const target = party.is_playing
      ? party.position_seconds + elapsed
      : party.position_seconds;
    if (Math.abs(a.currentTime - target) > MAX_DRIFT) {
      a.currentTime = target;
    }
    if (party.is_playing && a.paused) a.play().catch(() => {});
    if (!party.is_playing && !a.paused) a.pause();
  }, [party, isHost]);

  // Host: set source on track change
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !party || !isHost) return;
    if (party.current_track_url && a.src !== party.current_track_url) {
      a.src = party.current_track_url;
      if (party.is_playing) a.play().catch(() => {});
    }
  }, [party, isHost]);

  const togglePlay = async () => {
    if (!party || !isHost) return;
    const a = audioRef.current;
    if (!a) return;
    const next = a.paused;
    if (next) {
      await a.play();
    } else {
      a.pause();
    }
    await updateState.mutateAsync({
      id: party.id,
      is_playing: next,
      position_seconds: Math.floor(a.currentTime),
    });
  };

  const handleEnd = async () => {
    if (!party) return;
    await endParty.mutateAsync(party.id);
    toast.success('Party ended');
  };

  if (!party) return <div className="p-6 text-muted-foreground">Loading party…</div>;

  return (
    <div className="mobile-safe-content min-h-screen flex flex-col max-w-2xl mx-auto p-4 gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Badge className="bg-red-500 text-white text-[10px] mb-1">LIVE</Badge>
          <h1 className="text-xl font-bold truncate">{party.title}</h1>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Users className="w-3 h-3" />
            {party.participant_count.toLocaleString()} listening
          </div>
        </div>
        {isHost && (
          <Button variant="outline" size="sm" onClick={handleEnd} className="rounded-full min-h-[44px]">
            <X className="w-4 h-4 mr-1" /> End
          </Button>
        )}
      </header>

      {/* Player */}
      <Card className="p-4 bg-card/40 border-border/40 space-y-3">
        {party.cover_url && (
          <div className="aspect-square w-full max-w-[240px] mx-auto rounded-xl overflow-hidden bg-muted/20">
            <img src={party.cover_url} alt="" loading="lazy" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="text-center">
          <p className="font-semibold">{party.current_track_title ?? 'No track'}</p>
          <p className="text-sm text-muted-foreground">{party.current_track_artist}</p>
        </div>
        <audio ref={audioRef} preload="auto" />
        <div className="flex justify-center">
          {isHost ? (
            <Button
              size="icon"
              onClick={togglePlay}
              className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90"
            >
              {party.is_playing ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current" />
              )}
            </Button>
          ) : (
            <Badge variant="outline" className="text-xs">
              {party.is_playing ? 'Playing in sync' : 'Paused by host'}
            </Badge>
          )}
        </div>
      </Card>

      {/* Chat */}
      <Card className="flex-1 flex flex-col bg-card/40 border-border/40 min-h-[280px]">
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground pt-4">
              Say hi 👋
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="text-muted-foreground text-xs mr-2">
                  {m.user_id === party.host_id ? '👑' : '·'}
                </span>
                {m.body}
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            send(draft);
            setDraft('');
          }}
          className="flex gap-2 p-3 border-t border-border/40"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Drop a message…"
            className="text-base"
            maxLength={500}
          />
          <Button type="submit" size="icon" className="shrink-0 h-11 w-11">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default ListeningPartyPage;
