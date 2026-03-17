import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, ArrowRight, Search } from "lucide-react";
import { trackEvent } from "@/lib/posthog";

const stages = [
  { id: "just-starting" as const, label: "Just Starting Out", detail: "0 members, $0 MRR", desc: "You have the vision but haven't launched yet.", emoji: "🌱" },
  { id: "early-traction" as const, label: "Early Traction", detail: "Up to 100 members or $1k MRR", desc: "You've got your first fans and a taste of revenue.", emoji: "🚀" },
  { id: "growing" as const, label: "Growing", detail: "Up to 500 members or $5k MRR", desc: "Things are working. Now you need to systemize.", emoji: "📈" },
  { id: "scaling" as const, label: "Scaling", detail: "500+ members or $5k+ MRR", desc: "You're ready to build a real team and operation.", emoji: "🏗️" },
];

const challenges = [
  { id: "first-members" as const, label: "Getting my first members", emoji: "👥" },
  { id: "pricing" as const, label: "Pricing my offer", emoji: "💰" },
  { id: "content" as const, label: "Creating content consistently", emoji: "✍️" },
  { id: "converting" as const, label: "Converting free to paid", emoji: "🔄" },
  { id: "churn" as const, label: "Reducing churn", emoji: "📉" },
  { id: "scaling-ceiling" as const, label: "Scaling past my current ceiling", emoji: "🚧" },
];

const userTypes = [
  { label: "Coach / Consultant", emoji: "🎯" },
  { label: "Course Creator", emoji: "📚" },
  { label: "Community Builder", emoji: "🤝" },
  { label: "Content Creator", emoji: "📱" },
  { label: "Streamer / Entertainer", emoji: "🎮" },
  { label: "Artist / Designer", emoji: "🎨" },
  { label: "Service Provider", emoji: "🔧" },
  { label: "Other", emoji: "✨" },
];

const loadingSteps = [
  "Analyzing your category",
  "Setting up your feature defaults",
  "Calculating your growth potential",
  "Preparing your personalized dashboard",
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const { setProfile, setIsOnboarded, isOnboarded, refreshProfile } = useApp();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const navigate = useNavigate();

  // Fetch business categories
  const { data: categories = [] } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_categories")
        .select("*")
        .order("position");
      return data || [];
    },
  });

  useEffect(() => {
    if (isOnboarded) navigate("/dashboard", { replace: true });
  }, [isOnboarded, navigate]);

  // Load partial progress
  useEffect(() => {
    const loadProgress = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("creator_type, creator_stage, creator_challenge, business_category, user_type")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const d = data as any;
        if (d.business_category) setSelectedCategory(d.business_category);
        if (d.user_type) setSelectedUserType(d.user_type);
        if (d.creator_stage) setSelectedStage(d.creator_stage);
        if (d.creator_challenge) setSelectedChallenge(d.creator_challenge);
        if (d.creator_challenge) setStep(5);
        else if (d.creator_stage) setStep(5);
        else if (d.user_type) setStep(4);
        else if (d.business_category) setStep(3);
      }
    };
    loadProgress();
  }, [user]);

  const next = () => setStep(s => s + 1);

  const startLoading = async () => {
    setStep(6);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setLoadingStep(i);
      if (i >= loadingSteps.length) {
        clearInterval(interval);
        setTimeout(async () => {
          if (user) {
            await supabase
              .from("profiles")
              .update({
                business_category: selectedCategory,
                user_type: selectedUserType,
                creator_stage: selectedStage,
                creator_challenge: selectedChallenge,
                creator_type: selectedUserType, // Map to existing field
              } as any)
              .eq("user_id", user.id);
          }
          setProfile({
            type: selectedUserType as any,
            stage: selectedStage as any,
            challenge: selectedChallenge as any,
          });
          setIsOnboarded(true);
          refreshProfile();
          navigate("/dashboard");
        }, 800);
      }
    }, 750);
  };

  const progress = (step / 6) * 100;

  const filteredCategories = categories.filter((c: any) =>
    !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-1 bg-secondary w-full">
        <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-lg text-center">
              <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Let's personalize your experience.</h1>
              <p className="text-muted-foreground text-lg mb-10">We'll set up the right tools for your business in 60 seconds.</p>
              <Button variant="hero" size="xl" onClick={next}>Let's Go <ArrowRight className="ml-1" /></Button>
            </motion.div>
          )}

          {/* Step 2: Business Category */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">What's your business category?</h2>
              <p className="text-muted-foreground text-center mb-6">This determines which features are enabled by default.</p>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                {filteredCategories.map((cat: any) => (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`glass-card p-4 text-center transition-all duration-200 hover:translate-y-[-2px] ${
                      selectedCategory === cat.slug ? "border-primary bg-primary/5" : "hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{cat.icon}</span>
                    <span className="text-sm font-semibold block">{cat.name}</span>
                    <span className="text-[10px] text-muted-foreground block mt-1">{cat.description}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-center mt-6">
                <Button variant="hero" size="lg" onClick={next} disabled={!selectedCategory}>
                  Continue <ArrowRight className="ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: User Type / Service */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What best describes you?</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {userTypes.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setSelectedUserType(t.label)}
                    className={`glass-card p-5 text-center transition-all duration-200 hover:translate-y-[-2px] ${
                      selectedUserType === t.label ? "border-primary bg-primary/5" : "hover:border-primary/30"
                    }`}
                  >
                    <span className="text-3xl mb-2 block">{t.emoji}</span>
                    <span className="text-sm font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-8">
                <Button variant="hero" size="lg" onClick={next} disabled={!selectedUserType}>
                  Continue <ArrowRight className="ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Stage */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-lg w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Where are you right now?</h2>
              <div className="space-y-3">
                {stages.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStage(s.id)}
                    className={`glass-card p-5 w-full text-left transition-all duration-200 hover:translate-y-[-2px] ${
                      selectedStage === s.id ? "border-primary bg-primary/5" : "hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{s.emoji}</span>
                      <div>
                        <div className="font-bold">{s.label}</div>
                        <div className="text-xs text-primary font-medium">{s.detail}</div>
                        <div className="text-sm text-muted-foreground mt-1">{s.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-8">
                <Button variant="hero" size="lg" onClick={next} disabled={!selectedStage}>
                  Continue <ArrowRight className="ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Challenge */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What's your biggest challenge?</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {challenges.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChallenge(c.id)}
                    className={`glass-card p-5 text-center transition-all duration-200 hover:translate-y-[-2px] ${
                      selectedChallenge === c.id ? "border-primary bg-primary/5" : "hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{c.emoji}</span>
                    <span className="text-sm font-semibold">{c.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-8">
                <Button variant="hero" size="lg" onClick={startLoading} disabled={!selectedChallenge}>
                  Build My Plan <ArrowRight className="ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 6: Loading */}
          {step === 6 && (
            <motion.div key="s6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Setting up your workspace...</h2>
              <div className="space-y-4">
                {loadingSteps.map((ls, i) => (
                  <motion.div key={ls} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }} className="flex items-center gap-3 glass-card p-4">
                    {i < loadingStep ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </motion.div>
                    ) : i === loadingStep ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-border" />
                    )}
                    <span className={`text-sm font-medium ${i < loadingStep ? "text-foreground" : "text-muted-foreground"}`}>{ls}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
