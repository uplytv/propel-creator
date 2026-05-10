import { Link } from "react-router-dom";
import type { Mood } from "../lib/moods";

const MOOD_GRADIENTS: Record<Mood, string> = {
  Chill: "linear-gradient(135deg,#0EA5E9,#6366F1)",
  Hype: "linear-gradient(135deg,#F97316,#EF4444)",
  Focus: "linear-gradient(135deg,#0F766E,#1E293B)",
  Workout: "linear-gradient(135deg,#DC2626,#7C2D12)",
  Party: "linear-gradient(135deg,#EC4899,#8B5CF6)",
  Romance: "linear-gradient(135deg,#F472B6,#BE185D)",
  Sad: "linear-gradient(135deg,#475569,#0F172A)",
  Sleep: "linear-gradient(135deg,#1E1B4B,#0F172A)",
};

export default function MoodTile({ mood }: { mood: Mood }) {
  return (
    <Link
      to={`/music/search?mood=${encodeURIComponent(mood)}`}
      className="relative aspect-[5/3] rounded-2xl overflow-hidden flex items-end p-3 active:scale-[0.98] transition"
      style={{ background: MOOD_GRADIENTS[mood] }}
    >
      <h3 className="text-lg font-black text-white drop-shadow">{mood}</h3>
    </Link>
  );
}
