import { createContext, useContext, useState, ReactNode } from "react";

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
}

const tierNames = ["Starter", "Rising", "Scaling", "Elite"];

const defaultProfile: CreatorProfile = {
  type: null,
  stage: null,
  challenge: null,
  tier: 1,
  tierName: "Starter",
  members: 47,
  mrr: 820,
  totalRevenue: 4250,
  healthScore: 62,
  name: "Creator",
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<CreatorProfile>(defaultProfile);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState("");

  const setProfile = (p: Partial<CreatorProfile>) => {
    setProfileState((prev) => ({ ...prev, ...p }));
  };

  return (
    <AppContext.Provider
      value={{ profile, setProfile, isOnboarded, setIsOnboarded, showCelebration, setShowCelebration, celebrationTier, setCelebrationTier }}
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
