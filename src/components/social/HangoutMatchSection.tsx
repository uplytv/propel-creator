import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, X, Heart, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Candidate {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio?: string | null;
  city?: string | null;
}

const HANGOUT_PROMPTS = [
  "Wanna hang out?",
  "Down to grab coffee?",
  "Up for an adventure?",
  "Let's link up",
  "Looking for a plus-one?",
];

export default function HangoutMatchSection() {
  const { user } = useAuth();
  const { followingIds } = useFollows();
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const prompt = useMemo(
    () => HANGOUT_PROMPTS[Math.floor(Math.random() * HANGOUT_PROMPTS.length)],
    []
  );

  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: ["hangout-candidates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Pull recently active profiles, exclude self + already-following
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, bio, city")
        .neq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data || []).filter(
        (p: Candidate) => !followingIds.includes(p.user_id)
      );
    },
    staleTime: 60_000,
  });

  const sendRequest = useMutation({
    mutationFn: async ({ targetId }: { targetId: string }) => {
      if (!user) throw new Error("Sign in required");
      const [a, b] = [user.id, targetId].sort();
      const { error } = await (supabase as any)
        .from("friend_connections")
        .insert({
          user_id: a,
          friend_id: b,
          initiated_by: user.id,
          status: "pending",
        });
      if (error && !`${error.message}`.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friend-status"] });
      toast.success("Hangout request sent ✨");
    },
    onError: (e: any) => toast.error(e?.message || "Couldn't send request"),
  });

  const visible = candidates.filter((c) => !skipped.has(c.user_id));
  const current = visible[index];
  const next = visible[index + 1];

  if (!user) return null;
  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <div
          className="h-80 w-full rounded-2xl animate-pulse"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        />
      </div>
    );
  }
  if (!current) {
    return (
      <div className="px-4 py-3">
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            backgroundColor: "rgba(61, 124, 255,0.06)",
            border: "1px solid rgba(61, 124, 255,0.2)",
          }}
        >
          <Sparkles
            className="w-6 h-6 mx-auto mb-2"
            style={{ color: "#3D7CFF" }}
          />
          <p className="text-white text-sm font-semibold">
            You've seen everyone for now
          </p>
          <p className="text-white/50 text-xs mt-1">
            Check back soon for new hangout matches
          </p>
        </div>
      </div>
    );
  }

  const advance = () => setIndex((i) => i + 1);

  const onPass = (id: string) => {
    setSkipped((s) => new Set(s).add(id));
    advance();
  };

  const onLike = (c: Candidate) => {
    sendRequest.mutate({ targetId: c.user_id });
    advance();
  };

  const handleDragEnd = (_: any, info: PanInfo, c: Candidate) => {
    if (info.offset.x > 100) onLike(c);
    else if (info.offset.x < -100) onPass(c.user_id);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" style={{ color: "#3D7CFF" }} />
          Find Hangout Friends
        </h3>
        <span className="text-[10px] text-white/40">Swipe to connect</span>
      </div>
      <p className="text-xs text-white/50 mb-3">{prompt}</p>

      <div className="relative h-80 w-full select-none">
        {/* Background card peek */}
        {next && (
          <div
            className="absolute inset-0 rounded-2xl scale-95 opacity-50"
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          />
        )}

        <AnimatePresence>
          <motion.div
            key={current.user_id}
            className="absolute inset-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(e, info) => handleDragEnd(e, info, current)}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ x: 0, opacity: 0 }}
            whileTap={{ scale: 0.98 }}
          >
            {current.avatar_url ? (
              <img
                src={current.avatar_url}
                alt={current.display_name || current.username || "Someone new"}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="w-32 h-32">
                  <AvatarFallback className="bg-white/10 text-white text-2xl">
                    {(current.display_name || "U").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            <div
              className="absolute inset-x-0 bottom-0 p-4 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.5) 60%, transparent)",
              }}
            >
              <p className="text-white font-bold text-lg leading-tight">
                {current.display_name || current.username || "Someone new"}
              </p>
              {current.username && (
                <p className="text-white/60 text-xs">@{current.username}</p>
              )}
              {current.city && (
                <p className="text-white/70 text-xs mt-1 inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {current.city}
                </p>
              )}
              {current.bio && (
                <p className="text-white/80 text-xs mt-2 line-clamp-2">
                  {current.bio}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4">
        <button
          onClick={() => onPass(current.user_id)}
          aria-label="Pass"
          className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <X className="w-6 h-6 text-white/70" />
        </button>
        <button
          onClick={() => onLike(current)}
          disabled={sendRequest.isPending}
          aria-label="Send hangout request"
          className="w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-lg"
          style={{
            backgroundColor: "#3D7CFF",
            boxShadow: "0 8px 24px -8px rgba(61, 124, 255,0.6)",
          }}
        >
          <Heart className="w-7 h-7" style={{ color: "#0A0A0A" }} fill="#0A0A0A" />
        </button>
      </div>
    </div>
  );
}
