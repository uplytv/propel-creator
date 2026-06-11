import { useState } from "react";
import { X, ChevronRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface EventCreatorProps {
  onClose: () => void;
}

const EVENT_TYPES = ["Concert", "Club Night", "Festival", "Happy Hour", "Pop-up", "Other"];
const AGE_OPTIONS = ["All Ages", "18+", "21+"];
const GENRE_OPTIONS = ["House", "Techno", "Hip-Hop", "R&B", "Pop", "Latin", "EDM", "Jazz", "Other"];

export default function EventCreator({ onClose }: EventCreatorProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("Concert");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");

  // Step 2
  const [isFree, setIsFree] = useState(true);
  const [ticketPrice, setTicketPrice] = useState("");
  const [coverCharge, setCoverCharge] = useState("");
  const [ageRestriction, setAgeRestriction] = useState("All Ages");
  const [dressCode, setDressCode] = useState("");
  const [isHappyHour, setIsHappyHour] = useState(false);
  const [hhStart, setHhStart] = useState("");
  const [hhEnd, setHhEnd] = useState("");
  const [hhSpecials, setHhSpecials] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const toggleGenre = (g: string) => {
    setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const handlePublish = async () => {
    if (!user || !title.trim() || !eventDate) return;
    setLoading(true);
    try {
      const startsAt = eventDate && startTime ? `${eventDate}T${startTime}:00` : `${eventDate}T00:00:00`;
      const endsAt = eventDate && endTime ? `${eventDate}T${endTime}:00` : `${eventDate}T23:59:59`;
      const { error } = await supabase.from("events").insert({
        title: title.trim(),
        event_type: eventType,
        starts_at: startsAt,
        ends_at: endsAt,
        location_name: venue.trim() || null,
        location_city: city.trim() || null,
        ticket_price: isFree ? 0 : parseFloat(ticketPrice) || 0,
        cover_charge: parseFloat(coverCharge) || null,
        age_restriction: ageRestriction !== "All Ages" ? ageRestriction : null,
        dress_code: dressCode || null,
        happy_hour_start: isHappyHour && hhStart ? hhStart : null,
        happy_hour_end: isHappyHour && hhEnd ? hhEnd : null,
        description: description.trim() || null,
        creator_id: user.id,
        is_free: isFree,
      });
      if (error) throw error;
      toast.success("Event published! 🎉");
      queryClient.invalidateQueries({ queryKey: ["social-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
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
          maxHeight: "90vh",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }} />
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: "rgba(255,255,255,0.5)" }}>
          <X className="w-5 h-5" />
        </button>

        {/* Step indicators */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full"
              style={{ background: s <= step ? "#3D7CFF" : "rgba(255,255,255,0.1)" }}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Create Event — Basics</h2>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event name" className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30" style={inputStyle} />
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((t) => (
                <button key={t} onClick={() => setEventType(t)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: eventType === t ? "rgba(61, 124, 255,0.15)" : "rgba(255,255,255,0.06)", color: eventType === t ? "#3D7CFF" : "rgba(255,255,255,0.5)", border: `1px solid ${eventType === t ? "rgba(61, 124, 255,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                  {t}
                </button>
              ))}
            </div>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full p-3 rounded-xl text-sm text-white" style={inputStyle} />
            <div className="flex gap-2">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="Start" className="flex-1 p-3 rounded-xl text-sm text-white" style={inputStyle} />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="End" className="flex-1 p-3 rounded-xl text-sm text-white" style={inputStyle} />
            </div>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue name" className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30" style={inputStyle} />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30" style={inputStyle} />
            <button onClick={() => setStep(2)} disabled={!title.trim() || !eventDate} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1" style={{ backgroundColor: title.trim() && eventDate ? "#3D7CFF" : "rgba(255,255,255,0.1)", color: title.trim() && eventDate ? "#0A0A0A" : "rgba(255,255,255,0.3)" }}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Details</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm text-white/70">Free event?</label>
              <button onClick={() => setIsFree(!isFree)} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: isFree ? "#3D7CFF" : "rgba(255,255,255,0.06)", color: isFree ? "#0A0A0A" : "rgba(255,255,255,0.5)" }}>
                {isFree ? "Yes" : "No"}
              </button>
            </div>
            {!isFree && (
              <input value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} placeholder="$ Ticket price" type="number" className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30" style={inputStyle} />
            )}
            <input value={coverCharge} onChange={(e) => setCoverCharge(e.target.value)} placeholder="$ Cover charge (optional)" type="number" className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30" style={inputStyle} />
            <div className="flex gap-2">
              {AGE_OPTIONS.map((a) => (
                <button key={a} onClick={() => setAgeRestriction(a)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: ageRestriction === a ? "rgba(61, 124, 255,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${ageRestriction === a ? "rgba(61, 124, 255,0.3)" : "rgba(255,255,255,0.1)"}`, color: ageRestriction === a ? "#3D7CFF" : "rgba(255,255,255,0.5)" }}>
                  {a}
                </button>
              ))}
            </div>
            <input value={dressCode} onChange={(e) => setDressCode(e.target.value)} placeholder="Dress code (optional)" className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30" style={inputStyle} />
            <div>
              <label className="text-xs text-white/50 mb-2 block">Genre Tags</label>
              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.map((g) => (
                  <button key={g} onClick={() => toggleGenre(g)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: genres.includes(g) ? "rgba(61, 124, 255,0.15)" : "rgba(255,255,255,0.06)", color: genres.includes(g) ? "#3D7CFF" : "rgba(255,255,255,0.5)", border: `1px solid ${genres.includes(g) ? "rgba(61, 124, 255,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30 resize-none" style={{ ...inputStyle, minHeight: 80 }} />
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ border: "1.5px solid rgba(255,255,255,0.2)", color: "white" }}>Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}>
                Preview
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Preview & Publish</h2>
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 className="text-white font-bold text-base mb-1">{title}</h3>
              <p className="text-xs mb-1" style={{ color: "#3D7CFF" }}>{eventDate} {startTime && `· ${startTime}`} {endTime && `- ${endTime}`}</p>
              {venue && <p className="text-xs text-white/50">{venue}{city && ` · ${city}`}</p>}
              <p className="text-xs text-white/50 mt-1">{eventType} {!isFree && `· $${ticketPrice}`} {isFree && "· Free"}</p>
              {genres.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {genres.map((g) => (
                    <span key={g} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>{g}</span>
                  ))}
                </div>
              )}
              {description && <p className="text-xs text-white/60 mt-2">{description}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ border: "1.5px solid rgba(255,255,255,0.2)", color: "white" }}>Back</button>
              <button onClick={handlePublish} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold transition-transform active:scale-95" style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A", opacity: loading ? 0.5 : 1 }}>
                {loading ? "Publishing..." : "Publish Event 🎉"}
              </button>
            </div>
          </div>
        )}
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
