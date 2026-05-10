import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, LogOut, Users } from "lucide-react";
import {
  useAudioRoom,
  useAudioRoomParticipants,
  useJoinAudioRoom,
  useLeaveAudioRoom,
  useEndAudioRoom,
} from "../hooks/useAudioRooms";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AudioRoomPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: room } = useAudioRoom(id);
  const { data: participants } = useAudioRoomParticipants(id);
  const join = useJoinAudioRoom();
  const leave = useLeaveAudioRoom();
  const end = useEndAudioRoom();

  useEffect(() => {
    if (!id || !user) return;
    join.mutate(id);
    return () => {
      leave.mutate(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  if (!room) return <div className="p-8 text-white/60">Loading room…</div>;

  const isHost = user?.id === room.host_id;

  return (
    <div className="pb-40">
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link to="/music/live" className="p-2 rounded-full bg-white/5 text-white" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-white truncate flex-1">{room.title}</h1>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
        </span>
      </header>

      <div className="px-4">
        {room.topic && <p className="text-sm text-white/60">{room.topic}</p>}
        <p className="mt-1 text-xs text-white/50 flex items-center gap-1">
          <Users className="w-3 h-3" /> {participants?.length ?? 0} in room
        </p>

        <div className="mt-6 grid grid-cols-4 gap-3">
          {(participants ?? []).map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <div className="relative">
                {p.profile?.avatar_url ? (
                  <img
                    src={p.profile.avatar_url}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover border-2 border-white/10"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white/10" />
                )}
                {p.role !== "listener" && (
                  <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-fuchsia-500 text-white">
                    <Mic className="w-3 h-3" />
                  </span>
                )}
              </div>
              <span className="text-[11px] text-white/70 truncate max-w-full">
                {p.profile?.display_name || p.profile?.username || "User"}
              </span>
              {p.role === "host" && (
                <span className="text-[9px] uppercase font-bold text-fuchsia-300">Host</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2">
          {isHost ? (
            <button
              onClick={async () => {
                await end.mutateAsync(room.id);
                toast.success("Room ended");
                nav("/music/live");
              }}
              className="w-full py-3 rounded-full bg-red-500/20 text-red-300 font-semibold border border-red-500/30"
            >
              End Room
            </button>
          ) : (
            user && (
              <button
                onClick={async () => {
                  await leave.mutateAsync(room.id);
                  nav("/music/live");
                }}
                className="w-full py-3 rounded-full bg-white/5 text-white font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Leave Room
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
