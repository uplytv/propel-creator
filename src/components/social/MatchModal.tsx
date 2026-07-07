import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { PersonCard } from "@/hooks/usePeopleSwipe";

interface MatchModalProps {
  person: PersonCard;
  onClose: () => void;
}

export default function MatchModal({ person, onClose }: MatchModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSendMessage = async () => {
    if (!user) return;
    // Create or find existing DM conversation
    const { data: existing } = await supabase
      .from("direct_conversations")
      .select("id")
      .or(
        `and(participant_one.eq.${user.id},participant_two.eq.${person.user_id}),and(participant_one.eq.${person.user_id},participant_two.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      navigate(`/messages/${existing.id}`);
    } else {
      const { data: newConv } = await supabase
        .from("direct_conversations")
        .insert({
          participant_one: user.id,
          participant_two: person.user_id,
        })
        .select("id")
        .single();
      if (newConv) navigate(`/messages/${newConv.id}`);
    }
    onClose();
  };

  const userInitials = "You";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 6 + Math.random() * 8,
              height: 6 + Math.random() * 8,
              backgroundColor: "#3D7CFF",
              opacity: 0.3 + Math.random() * 0.4,
              left: `${10 + Math.random() * 80}%`,
              top: `${20 + Math.random() * 60}%`,
              animation: `floatParticle ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 px-8 text-center relative z-10">
        <p className="text-3xl font-black text-white">✨ It's a Match! ✨</p>

        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20 border-2" style={{ borderColor: "#3D7CFF" }}>
            <AvatarFallback className="bg-white/10 text-white text-lg font-bold">{userInitials}</AvatarFallback>
          </Avatar>
          <span className="text-3xl">💚</span>
          <Avatar className="w-20 h-20 border-2" style={{ borderColor: "#3D7CFF" }}>
            <AvatarImage src={person.avatar_url || undefined} />
            <AvatarFallback className="bg-white/10 text-white text-lg font-bold">
              {(person.display_name || "U").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </div>

        <p className="text-white/70 text-sm">
          You and <span className="text-white font-semibold">{person.display_name}</span> both
          Heyed each other!
        </p>

        <button
          onClick={handleSendMessage}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-transform active:scale-95"
          style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
        >
          Send a Message →
        </button>

        <button
          onClick={onClose}
          className="text-white/50 text-sm font-medium"
        >
          Keep Swiping
        </button>
      </div>

      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-40px) scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
