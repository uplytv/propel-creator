import { useState, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import SwipeCard from "@/components/social/SwipeCard";
import MatchModal from "@/components/social/MatchModal";
import SuperHeySheet from "@/components/social/SuperHeySheet";
import { usePeopleSwipe, type PersonCard } from "@/hooks/usePeopleSwipe";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function SocialPeople() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cards, isLoading, dismiss, sendHey, checkMutual } = usePeopleSwipe();
  const [matchPerson, setMatchPerson] = useState<PersonCard | null>(null);
  const [superHeyPerson, setSuperHeyPerson] = useState<PersonCard | null>(null);

  const topCards = cards.slice(0, 3);

  const handleHey = useCallback(async (person: PersonCard) => {
    dismiss(person.user_id);
    try {
      await sendHey(person.user_id);
      const isMutual = await checkMutual(person.user_id);
      if (isMutual) {
        setMatchPerson(person);
      } else {
        toast.success("Hey sent! 👋");
      }
    } catch (err: any) {
      if (!err.message?.includes("Already")) {
        toast.error(err.message || "Failed");
      }
    }
  }, [dismiss, sendHey, checkMutual]);

  const handlePass = useCallback((person: PersonCard) => {
    dismiss(person.user_id);
  }, [dismiss]);

  const handleSuperHey = useCallback((person: PersonCard) => {
    setSuperHeyPerson(person);
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <span className="text-4xl mb-4">👋</span>
        <p className="text-foreground font-bold text-lg mb-2">Sign in to discover people</p>
        <button
          onClick={() => navigate("/auth")}
          className="px-6 py-3 rounded-xl font-bold text-sm"
          style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
        >
          Sign In
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-8">
        <Skeleton className="w-full rounded-2xl" style={{ height: "65vh" }} />
      </div>
    );
  }

  if (topCards.length === 0) {
    return (
      <>
        <SEOHead title="People — UPLY" description="Find your people on UPLY" />
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <span className="text-5xl mb-4">🌙</span>
          <p className="text-foreground font-bold text-lg mb-2">You've seen everyone nearby</p>
          <p className="text-muted-foreground text-sm mb-6">
            Check back when more people update their Going Out plans
          </p>
          <button
            onClick={() => navigate("/discover")}
            className="px-6 py-3 rounded-xl font-bold text-sm transition-transform active:scale-95"
            style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
          >
            Update My Going Out Plan
          </button>
        </div>
      </>
    );
  }

  const topPerson = topCards[0];

  return (
    <>
      <SEOHead title="People — UPLY" description="Find your people on UPLY" />
      <div className="pb-20 flex flex-col" style={{ minHeight: "calc(100vh - 100px)" }}>
        {/* Card stack */}
        <div className="relative flex-1" style={{ minHeight: "65vh" }}>
          {topCards.map((person, i) => (
            <SwipeCard
              key={person.user_id}
              person={person}
              index={i}
              isTop={i === 0}
              onSwipeRight={() => handleHey(person)}
              onSwipeLeft={() => handlePass(person)}
              onSwipeUp={() => handleSuperHey(person)}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6 py-4">
          {/* Pass */}
          <button
            onClick={() => handlePass(topPerson)}
            className="flex items-center justify-center transition-transform active:scale-90"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.15)",
              fontSize: 20,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            ✕
          </button>

          {/* Hey */}
          <button
            onClick={() => handleHey(topPerson)}
            className="flex items-center justify-center transition-transform active:scale-90"
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: "#3D7CFF",
              border: "none",
              fontSize: 26,
              boxShadow: "0 4px 20px rgba(61, 124, 255,0.4)",
            }}
          >
            👋
          </button>

          {/* Super Hey */}
          <button
            onClick={() => handleSuperHey(topPerson)}
            className="flex items-center justify-center transition-transform active:scale-90"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FFD700, #FF8C00)",
              border: "none",
              fontSize: 20,
              boxShadow: "0 4px 16px rgba(255,165,0,0.4)",
            }}
          >
            ⚡
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground/70 pb-2">
          Drag the card ↑ to preview swipe
        </p>
      </div>

      {matchPerson && <MatchModal person={matchPerson} onClose={() => setMatchPerson(null)} />}
      {superHeyPerson && (
        <SuperHeySheet
          person={superHeyPerson}
          onClose={() => setSuperHeyPerson(null)}
          onSuccess={() => {
            dismiss(superHeyPerson.user_id);
            setSuperHeyPerson(null);
          }}
        />
      )}
    </>
  );
}
