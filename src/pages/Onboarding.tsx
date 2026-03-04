import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Check, Loader2, ArrowRight } from "lucide-react";

const creatorTypes = [
  { label: "Coach", emoji: "🎯" },
  { label: "Course Creator", emoji: "📚" },
  { label: "Community Builder", emoji: "🤝" },
  { label: "Digital Product Seller", emoji: "📦" },
  { label: "Fitness Expert", emoji: "💪" },
  { label: "Music Artist", emoji: "🎵" },
  { label: "Wellness Creator", emoji: "🧘" },
  { label: "Other", emoji: "✨" },
] as const;

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

const loadingSteps = [
  "Analyzing your creator type",
  "Calculating your growth potential",
  "Assigning your tier",
  "Preparing your action plan",
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const { setProfile, setIsOnboarded } = useApp();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const navigate = useNavigate();

  const next = () => setStep((s) => s + 1);

  const startLoading = () => {
    setStep(5);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setLoadingStep(i);
      if (i >= loadingSteps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setProfile({
            type: selectedType as any,
            stage: selectedStage as any,
            challenge: selectedChallenge as any,
          });
          setIsOnboarded(true);
          navigate("/dashboard");
        }, 800);
      }
    }, 750);
  };

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-secondary w-full">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-lg text-center">
              <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Let's build your growth plan.</h1>
              <p className="text-muted-foreground text-lg mb-10">Answer 5 quick questions. Your AI Growth Partner will have your personalized plan ready in 60 seconds.</p>
              <Button variant="hero" size="xl" onClick={next}>Let's Go <ArrowRight className="ml-1" /></Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What type of creator are you?</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {creatorTypes.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => { setSelectedType(t.label); }}
                    className={`glass-card p-5 text-center transition-all duration-200 hover:translate-y-[-2px] ${selectedType === t.label ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}
                  >
                    <span className="text-3xl mb-2 block">{t.emoji}</span>
                    <span className="text-sm font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-8">
                <Button variant="hero" size="lg" onClick={next} disabled={!selectedType}>Continue <ArrowRight className="ml-1" /></Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-lg w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Where are you right now?</h2>
              <div className="space-y-3">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStage(s.id)}
                    className={`glass-card p-5 w-full text-left transition-all duration-200 hover:translate-y-[-2px] ${selectedStage === s.id ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}
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
                <Button variant="hero" size="lg" onClick={next} disabled={!selectedStage}>Continue <ArrowRight className="ml-1" /></Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What's your biggest challenge?</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {challenges.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChallenge(c.id)}
                    className={`glass-card p-5 text-center transition-all duration-200 hover:translate-y-[-2px] ${selectedChallenge === c.id ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}
                  >
                    <span className="text-2xl mb-2 block">{c.emoji}</span>
                    <span className="text-sm font-semibold">{c.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-8">
                <Button variant="hero" size="lg" onClick={startLoading} disabled={!selectedChallenge}>Build My Plan <ArrowRight className="ml-1" /></Button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Building your growth plan...</h2>
              <div className="space-y-4">
                {loadingSteps.map((ls, i) => (
                  <motion.div
                    key={ls}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center gap-3 glass-card p-4"
                  >
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
