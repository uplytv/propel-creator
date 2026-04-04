import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type CreatorType = "Coach" | "Course Creator" | "Community Builder" | "Digital Product Seller" | "Fitness Expert" | "Music Artist" | "Wellness Creator" | "Other";
export type CreatorStage = "just-starting" | "early-traction" | "growing" | "scaling";
export type CreatorChallenge = "first-members" | "pricing" | "content" | "converting" | "churn" | "scaling-ceiling";

export interface CreatorProfile {
  type: CreatorType | null;
  stage: CreatorStage | null;
  challenge: CreatorChallenge | null;
  tier: 1 | 2 | 3 | 4;
  tierName: string;
  members: number;
  mrr: number;
  totalRevenue: number;
  healthScore: number;
  name: string;
  avatarUrl: string | null;
  isApproved: boolean;
}

interface AppContextType {
  profile: CreatorProfile;
  setProfile: (p: Partial<CreatorProfile>) => void;
  isOnboarded: boolean;
  setIsOnboarded: (v: boolean) => void;
  showCelebration: boolean;
  setShowCelebration: (v: boolean) => void;
  celebrationTier: string;
  setCelebrationTier: (t: string) => void;
  refreshProfile: () => void;
}

const tierNames = ["Starter", "Rising", "Scaling", "Elite"];

const defaultProfile: CreatorProfile = {
  type: null,
  stage: null,
  challenge: null,
  tier: 1,
  tierName: "Starter",
  members: 0,
  mrr: 0,
  totalRevenue: 0,
  healthScore: 0,
  name: "Creator",
  avatarUrl: null,
  isApproved: false,
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfileState] = useState<CreatorProfile>(defaultProfile);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState("");

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setProfileState({
        type: data.creator_type as CreatorType | null,
        stage: data.creator_stage as CreatorStage | null,
        challenge: data.creator_challenge as CreatorChallenge | null,
        tier: data.tier as 1 | 2 | 3 | 4,
        tierName: data.tier_name || "Starter",
        members: data.members || 0,
        mrr: Number(data.mrr) || 0,
        totalRevenue: Number(data.total_revenue) || 0,
        healthScore: data.health_score || 0,
        name: data.display_name || "Creator",
        avatarUrl: data.avatar_url || null,
        isApproved: !!(data as any).is_approved,
      });
      setIsOnboarded(!!data.creator_type);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const setProfile = (p: Partial<CreatorProfile>) => {
    setProfileState((prev) => ({ ...prev, ...p }));
  };

  return (
    <AppContext.Provider
      value={{ profile, setProfile, isOnboarded, setIsOnboarded, showCelebration, setShowCelebration, celebrationTier, setCelebrationTier, refreshProfile: loadProfile }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { tierNames };
