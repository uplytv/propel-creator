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
        type: (data as any).creator_type as CreatorType | null,
        stage: (data as any).creator_stage as CreatorStage | null,
        challenge: (data as any).creator_challenge as CreatorChallenge | null,
        tier: (data as any).tier as 1 | 2 | 3 | 4,
        tierName: (data as any).tier_name || "Starter",
        members: (data as any).members || 0,
        mrr: Number((data as any).mrr) || 0,
        totalRevenue: Number((data as any).total_revenue) || 0,
        healthScore: (data as any).health_score || 0,
        name: (data as any).display_name || "Creator",
        avatarUrl: (data as any).avatar_url || null,
      });
      // Check if onboarded (has creator_type set)
      setIsOnboarded(!!(data as any).creator_type);
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
