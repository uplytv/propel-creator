import { Link } from "react-router-dom";
import { Mic, Users } from "lucide-react";
import type { AudioRoom } from "../hooks/useAudioRooms";

export default function AudioRoomCard({ room }: { room: AudioRoom }) {
  return (
    <Link
      to={`/music/room/${room.id}`}
      className="shrink-0 w-60 rounded-xl p-3 bg-white/[0.04] border border-white/5 active:scale-[0.98] transition"
    >
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
        <Mic className="w-3.5 h-3.5 text-white/60" />
      </div>
      <h3 className="mt-2 text-sm font-semibold text-white line-clamp-2">{room.title}</h3>
      {room.topic && <p className="text-[11px] text-white/50 mt-1 line-clamp-1">{room.topic}</p>}
      <p className="mt-2 text-[11px] text-white/60 flex items-center gap-1">
        <Users className="w-3 h-3" /> {room.listeners_count} listening
      </p>
    </Link>
  );
}
