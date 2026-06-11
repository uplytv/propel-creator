import { useState } from "react";
import { X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ProducerRegistrationProps {
  onClose: () => void;
}

const PRODUCER_TYPES = [
  { label: "Venue", emoji: "🏟️", value: "venue" },
  { label: "Promoter", emoji: "📢", value: "promoter" },
  { label: "Artist", emoji: "🎵", value: "artist" },
];

export default function ProducerRegistration({ onClose }: ProducerRegistrationProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("venue");
  const [city, setCity] = useState("");
  const [link, setLink] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_producer: true,
          producer_type: type,
          display_name: name.trim(),
          location: city.trim() || undefined,
          bio: bio.trim() || undefined,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("You're now a Producer! 🎛️");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["producers"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[99]" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] overflow-y-auto"
        style={{
          background: "#141414",
          borderRadius: "20px 20px 0 0",
          padding: "16px 20px 40px",
          maxHeight: "85vh",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 20px" }} />
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: "rgba(255,255,255,0.5)" }}>
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-4">Become a Producer</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Name / Venue Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              placeholder="Your name or venue"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-2 block">Producer Type</label>
            <div className="flex gap-2">
              {PRODUCER_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => setType(pt.value)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: type === pt.value ? "rgba(61, 124, 255,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${type === pt.value ? "#3D7CFF" : "rgba(255,255,255,0.1)"}`,
                    color: type === pt.value ? "#3D7CFF" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {pt.emoji} {pt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              placeholder="City"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Instagram / Website (optional)</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              placeholder="@handle or URL"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Short Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30 resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", minHeight: 80 }}
              placeholder="Tell people about you (150 chars)"
            />
            <p className="text-right text-[10px] text-white/30">{bio.length}/150</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-transform active:scale-95"
            style={{
              backgroundColor: "#3D7CFF",
              color: "#0A0A0A",
              opacity: loading || !name.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "Registering..." : "Become a Producer 🎛️"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
