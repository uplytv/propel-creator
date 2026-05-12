import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Radio } from "lucide-react";
import { useRadioStations, useCreateRadioStation } from "../hooks/useRadioStations";
import RadioStationCard from "../components/RadioStationCard";
import { useUpcomingPremieres } from "../hooks/usePremieres";
import PremiereCard from "../components/PremiereCard";
// audio-rooms archived
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function MusicLivePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: stations } = useRadioStations();
  const { data: premieres } = useUpcomingPremieres();
  const rooms: any[] = []; // audio-rooms archived
  const createStation = useCreateRadioStation();
  const startRoom = { isPending: false, mutateAsync: async (_: any) => ({ id: '' }) };

  const [stationName, setStationName] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [showCreateStation, setShowCreateStation] = useState(false);
  const [showStartRoom, setShowStartRoom] = useState(false);

  return (
    <div className="pb-40">
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link to="/music" className="p-2 rounded-full bg-white/5 text-white" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black text-white">Live</h1>
      </header>

      {/* Radio Stations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-lg font-bold text-white">Radio Stations</h2>
          {user && (
            <button
              onClick={() => setShowCreateStation((s) => !s)}
              className="text-xs text-white/70 flex items-center gap-1 px-2 py-1 rounded-full bg-white/5"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          )}
        </div>
        {showCreateStation && (
          <div className="mx-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <input
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="Station name"
              className="w-full px-3 py-2 rounded-lg bg-black/40 text-white text-base"
            />
            <button
              disabled={!stationName.trim() || createStation.isPending}
              onClick={async () => {
                const s = await createStation.mutateAsync({ name: stationName.trim() });
                setStationName("");
                setShowCreateStation(false);
                toast.success("Station created");
                nav(`/music/radio/${s.id}`);
              }}
              className="w-full py-2 rounded-full text-white font-semibold"
              style={{ background: "linear-gradient(90deg,#3D7CFF,#B025FF)" }}
            >
              Create Station
            </button>
          </div>
        )}
        <div className="flex gap-3 overflow-x-auto px-4 pb-2">
          {(stations ?? []).map((s) => (
            <RadioStationCard key={s.id} station={s} />
          ))}
          {!stations?.length && (
            <div className="text-sm text-white/40 flex items-center gap-2">
              <Radio className="w-4 h-4" /> No stations yet — be the first.
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Premieres */}
      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold text-white px-4">Upcoming Premieres</h2>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2">
          {(premieres ?? []).map((p) => (
            <PremiereCard key={p.id} premiere={p} />
          ))}
          {!premieres?.length && (
            <div className="text-sm text-white/40">No premieres scheduled.</div>
          )}
        </div>
      </section>

      {/* Live Audio Rooms */}
      <section className="mt-8 space-y-3">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-lg font-bold text-white">Live Audio Rooms</h2>
          {user && (
            <button
              onClick={() => setShowStartRoom((s) => !s)}
              className="text-xs text-white/70 flex items-center gap-1 px-2 py-1 rounded-full bg-white/5"
            >
              <Plus className="w-3 h-3" /> Start
            </button>
          )}
        </div>
        {showStartRoom && (
          <div className="mx-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <input
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              placeholder="Room title"
              className="w-full px-3 py-2 rounded-lg bg-black/40 text-white text-base"
            />
            <button
              disabled={!roomTitle.trim() || startRoom.isPending}
              onClick={async () => {
                const r = await startRoom.mutateAsync({ title: roomTitle.trim() });
                setRoomTitle("");
                setShowStartRoom(false);
                toast.success("Room is live");
                nav(`/music/room/${r.id}`);
              }}
              className="w-full py-2 rounded-full text-white font-semibold"
              style={{ background: "linear-gradient(90deg,#3D7CFF,#B025FF)" }}
            >
              Go Live
            </button>
          </div>
        )}
        <div className="flex gap-3 overflow-x-auto px-4 pb-2">
          {(rooms ?? []).map((r) => (
            <AudioRoomCard key={r.id} room={r} />
          ))}
          {!rooms?.length && (
            <div className="text-sm text-white/40">No rooms live right now.</div>
          )}
        </div>
      </section>
    </div>
  );
}
