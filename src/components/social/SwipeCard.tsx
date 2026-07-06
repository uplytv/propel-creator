import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PersonCard } from "@/hooks/usePeopleSwipe";

interface SwipeCardProps {
  person: PersonCard;
  index: number; // 0 = top
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  isTop: boolean;
}

export default function SwipeCard({ person, index, onSwipeRight, onSwipeLeft, onSwipeUp, isTop }: SwipeCardProps) {
  const { user } = useAuth();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | "up" | null>(null);
  const startRef = useRef({ x: 0, y: 0 });

  // Fetch current user's interests for music match
  const { data: myInterests } = useQuery({
    queryKey: ["my-interests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("profiles")
        .select("interests")
        .eq("user_id", user.id)
        .single();
      return (data?.interests as string[]) || [];
    },
    enabled: !!user,
    staleTime: 300_000,
  });

  const musicMatch = (() => {
    if (!myInterests?.length || !person.interests?.length) return null;
    const mySet = new Set(myInterests.map((i) => i.toLowerCase()));
    const overlap = person.interests.filter((i) => mySet.has(i.toLowerCase())).length;
    const total = new Set([...myInterests, ...person.interests]).size;
    return total > 0 ? Math.round((overlap / total) * 100) : null;
  })();

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!isTop) return;
    startRef.current = { x: clientX, y: clientY };
    setIsDragging(true);
  }, [isTop]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - startRef.current.x,
      y: clientY - startRef.current.y,
    });
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (offset.y < -100) {
      setExiting("up");
      setTimeout(onSwipeUp, 300);
    } else if (offset.x > 100) {
      setExiting("right");
      setTimeout(onSwipeRight, 300);
    } else if (offset.x < -100) {
      setExiting("left");
      setTimeout(onSwipeLeft, 300);
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }, [isDragging, offset, onSwipeRight, onSwipeLeft, onSwipeUp]);

  const scale = index === 0 ? 1 : index === 1 ? 0.95 : 0.9;
  const translateY = index === 0 ? 0 : index === 1 ? 8 : 16;
  const opacity = index === 0 ? 1 : index === 1 ? 0.8 : 0.6;
  const zIndex = 3 - index;

  const rotation = isDragging ? offset.x * 0.05 : 0;
  const showHeyBadge = offset.x > 40;
  const showPassBadge = offset.x < -40;

  let exitTransform = "";
  if (exiting === "left") exitTransform = "translateX(-150vw) rotate(-30deg)";
  else if (exiting === "right") exitTransform = "translateX(150vw) rotate(30deg)";
  else if (exiting === "up") exitTransform = "translateY(-150vh)";

  const initials = (person.display_name || "U").slice(0, 2).toUpperCase();
  const photoUrl = person.avatar_url;

  return (
    <div
      className="absolute inset-x-4"
      style={{
        zIndex,
        opacity: exiting ? 0 : opacity,
        transform: exiting
          ? exitTransform
          : `scale(${scale}) translateY(${translateY + (isDragging ? offset.y * 0.3 : 0)}px) translateX(${isDragging ? offset.x : 0}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : exiting ? "transform 0.3s ease, opacity 0.3s ease" : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        pointerEvents: isTop ? "auto" : "none",
        touchAction: "none",
      }}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => { if (isDragging) handleMove(e.clientX, e.clientY); }}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if (isDragging) handleEnd(); }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: 20,
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          height: "65vh",
          maxHeight: 520,
        }}
      >
        {/* Photo */}
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={person.display_name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(61, 124, 255,0.05)" }}>
            <span className="text-6xl" style={{ color: "rgba(61, 124, 255,0.3)" }}>
              {initials}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 60%)",
          }}
        />

        {/* HEY badge */}
        {showHeyBadge && (
          <div
            className="absolute top-6 left-6 px-4 py-2 rounded-xl"
            style={{
              border: "3px solid #3D7CFF",
              color: "#3D7CFF",
              fontSize: 24,
              fontWeight: 900,
              transform: "rotate(-15deg)",
            }}
          >
            HEY 👋
          </div>
        )}

        {/* PASS badge */}
        {showPassBadge && (
          <div
            className="absolute top-6 right-6 px-4 py-2 rounded-xl"
            style={{
              border: "3px solid #FF3B30",
              color: "#FF3B30",
              fontSize: 24,
              fontWeight: 900,
              transform: "rotate(15deg)",
            }}
          >
            PASS ✕
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-white text-2xl font-bold">{person.display_name}</span>
            {person.age && (
              <span className="text-white/70 text-lg">{person.age}</span>
            )}
          </div>

          {person.location && (
            <p className="text-white/60 text-sm mb-2">
              📍 {person.location}
            </p>
          )}

          {person.shared_event && (
            <span
              className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold mb-2"
              style={{ backgroundColor: "rgba(61, 124, 255,0.15)", color: "#3D7CFF" }}
            >
              📍 Going to {person.shared_event}
            </span>
          )}

          {musicMatch !== null && musicMatch > 0 && (
            <span
              className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold mb-2 ml-1"
              style={{ backgroundColor: "rgba(168,85,247,0.15)", color: "#A855F7" }}
            >
              🎵 {musicMatch}% match
            </span>
          )}

          {(person.shared_interests_count ?? 0) > 0 && (
            <span
              className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold mb-2 ml-1"
              style={{ backgroundColor: "rgba(0,200,255,0.15)", color: "#00C8FF" }}
            >
              ✨ {person.shared_interests_count} shared
            </span>
          )}

          {person.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {person.interests.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
