import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crown, Users, Copy, LogOut, Play, Pause } from "lucide-react";
import { useListeningParty, usePartyQueue } from "../hooks/useListeningParty";
import { usePlayerStore } from "../hooks/usePlayerStore";
import { useTrack } from "../hooks/useTrack";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function ListeningPartyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { party, members, isHost, updateState } = useListeningParty(code);
  const { data: queue } = usePartyQueue(party?.id);
  const { data: currentTrack } = useTrack(party?.current_track_id ?? undefined);

  const playerLoadTrack = usePlayerStore((s) => s.loadTrack);
  const playerCurrentId = usePlayerStore((s) => s.queue[s.currentIndex]?.id);
  const playerIsPlaying = usePlayerStore((s) => s.isPlaying);
  const playerPlay = usePlayerStore((s) => s.play);
  const playerPause = usePlayerStore((s) => s.pause);
  const playerSeek = usePlayerStore((s) => s.seek);
  const playerPosition = usePlayerStore((s) => s.positionSeconds);

  // Sync host -> party state
  useEffect(() => {
    if (!isHost || !party) return;
    const id = setInterval(() => {
      const cur = usePlayerStore.getState();
      const trackId = cur.queue[cur.currentIndex]?.id ?? null;
      if (
        trackId !== party.current_track_id ||
        Math.abs(cur.positionSeconds - party.position_seconds) > 2 ||
        cur.isPlaying !== party.is_playing
      ) {
        updateState({
          current_track_id: trackId,
          position_seconds: cur.positionSeconds,
          is_playing: cur.isPlaying,
        });
      }
    }, 2000);
    return () => clearInterval(id);
  }, [isHost, party?.id, party?.current_track_id, party?.position_seconds, party?.is_playing, updateState]);

  // Sync party state -> guest player
  useEffect(() => {
    if (!party || isHost || !currentTrack) return;
    if (playerCurrentId !== currentTrack.id) {
      playerLoadTrack(currentTrack);
    }
    if (Math.abs(playerPosition - party.position_seconds) > 3) {
      playerSeek(party.position_seconds);
    }
    if (party.is_playing && !playerIsPlaying) playerPlay();
    if (!party.is_playing && playerIsPlaying) playerPause();
  }, [party?.current_track_id, party?.position_seconds, party?.is_playing, currentTrack?.id, isHost]);

  if (!party) {
    return (
      <div className="p-8 text-white/60">
        Loading party… If this party has ended, the host may have closed it.
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/music/party/${party.share_code}`;

  return (
    <div className="pb-40 max-w-3xl mx-auto px-4 pt-4 space-y-6">
      <button
        onClick={() => navigate("/music")}
        className="inline-flex items-center gap-1 text-white/60 text-sm min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-2xl p-5" style={{ background: "rgba(0,255,133,0.06)", border: "1px solid rgba(0,255,133,0.2)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5" style={{ color: "#00FF85" }} />
          <h1 className="text-xl font-black text-white">{party.title}</h1>
        </div>
        <p className="text-white/60 text-sm">
          Code <span className="font-mono font-bold text-white">{party.share_code}</span>
          {isHost && <span className="ml-2 inline-flex items-center gap-1 text-xs"><Crown className="w-3 h-3" style={{ color: "#FFD700" }} /> You're the host</span>}
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            toast({ title: "Link copied" });
          }}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-full text-sm font-semibold"
          style={{ background: "#00FF85", color: "#000" }}
        >
          <Copy className="w-4 h-4" /> Copy invite link
        </button>
      </div>

      <section>
        <h2 className="text-white font-bold text-sm mb-2">Now playing</h2>
        {currentTrack ? (
          <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div
              className="w-14 h-14 rounded-lg flex-shrink-0"
              style={{
                background: currentTrack.cover_art_url
                  ? `url(${currentTrack.cover_art_url}) center/cover`
                  : "linear-gradient(135deg,#3D7CFF,#B025FF)",
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{currentTrack.title}</p>
              <p className="text-white/50 text-xs truncate">{currentTrack.genre || "Music"}</p>
            </div>
            {isHost ? (
              <button
                onClick={() => (party.is_playing ? playerPause() : playerPlay())}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full"
                style={{ background: "#00FF85", color: "#000" }}
              >
                {party.is_playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            ) : (
              <span className="text-xs text-white/40">{party.is_playing ? "Playing" : "Paused"}</span>
            )}
          </div>
        ) : (
          <p className="text-white/40 text-sm">
            {isHost ? "Pick a track from anywhere — it'll sync to your guests." : "Waiting for the host to start a track…"}
          </p>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-white/70" />
          <h2 className="text-white font-bold text-sm">In the room ({members.length + 1})</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: party.host_id, isHost: true, profile: null as any },
            ...members.map((m) => ({ id: m.user_id, isHost: false, profile: m.profiles })),
          ].map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 px-3 py-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-7 h-7 rounded-full"
                style={{
                  background: m.profile?.avatar_url
                    ? `url(${m.profile.avatar_url}) center/cover`
                    : "linear-gradient(135deg,#3D7CFF,#B025FF)",
                }}
              />
              <span className="text-white text-xs font-semibold">
                {m.profile?.display_name || m.profile?.username || (m.isHost ? "Host" : "Guest")}
              </span>
              {m.isHost && <Crown className="w-3 h-3" style={{ color: "#FFD700" }} />}
            </div>
          ))}
        </div>
      </section>

      {!!queue?.length && (
        <section>
          <h2 className="text-white font-bold text-sm mb-2">Up next</h2>
          <div className="space-y-1">
            {queue.map((q: any) => (
              <div key={q.id} className="flex items-center gap-3 rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div
                  className="w-10 h-10 rounded"
                  style={{
                    background: q.tracks?.cover_art_url
                      ? `url(${q.tracks.cover_art_url}) center/cover`
                      : "rgba(255,255,255,0.1)",
                  }}
                />
                <p className="text-white text-sm flex-1 truncate">{q.tracks?.title || "Unknown"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isHost && user && (
        <button
          onClick={() => navigate("/music")}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-full text-sm font-bold text-white"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <LogOut className="w-4 h-4" /> Leave party
        </button>
      )}
    </div>
  );
}
