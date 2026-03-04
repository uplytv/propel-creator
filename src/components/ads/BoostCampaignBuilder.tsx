import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Rocket, Target, DollarSign, Clock, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AIAudienceSuggestions, { type AISuggestion } from "./AIAudienceSuggestions";

export interface LaunchedCampaign {
  streamTitle: string;
  objective: string;
  objectiveLabel: string;
  dailyBudget: number;
  duration: number;
  audience: string;
  audienceLabel: string;
  platform: "meta" | "google";
}

interface BoostCampaignBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  streamTitle: string;
  creatorName: string;
  onLaunch?: (campaign: LaunchedCampaign) => void;
}

const objectives = [
  { id: "awareness", label: "Brand Awareness", desc: "Maximize views & impressions", icon: "👁️" },
  { id: "leads", label: "Lead Generation", desc: "Grow your community members", icon: "🧲" },
  { id: "conversions", label: "Conversions", desc: "Drive purchases & signups", icon: "💰" },
];

const audiences = [
  { id: "lookalike", label: "Lookalike from Members", icon: Users },
  { id: "stream-viewers", label: "Retarget Stream Viewers", icon: Target },
  { id: "page-visitors", label: "Retarget Page Visitors", icon: Target },
  { id: "broad", label: "Broad — AI Optimized", icon: Sparkles },
];

const budgetPresets = [10, 25, 50, 100];
const durationPresets = [3, 7, 14, 30];

export default function BoostCampaignBuilder({ isOpen, onClose, streamTitle, creatorName, onLaunch }: BoostCampaignBuilderProps) {
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState<string | null>(null);
  const [budget, setBudget] = useState(25);
  const [duration, setDuration] = useState(7);
  const [audience, setAudience] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"meta" | "google">("meta");
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);

  const handleLaunch = () => {
    setLaunching(true);
    setTimeout(() => {
      setLaunching(false);
      setLaunched(true);
      if (onLaunch && objective && audience) {
        onLaunch({
          streamTitle,
          objective,
          objectiveLabel: objectives.find((o) => o.id === objective)?.label ?? objective,
          dailyBudget: budget,
          duration,
          audience,
          audienceLabel: audiences.find((a) => a.id === audience)?.label ?? audience,
          platform,
        });
      }
    }, 2000);
  };

  const handleClose = () => {
    setStep(0);
    setObjective(null);
    setBudget(25);
    setDuration(7);
    setAudience(null);
    setLaunched(false);
    onClose();
  };

  const canProceed = () => {
    if (step === 0) return !!objective;
    if (step === 1) return budget > 0;
    if (step === 2) return !!audience;
    return true;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
        >
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg mx-4 mb-4 sm:mb-0"
          >
            <div className="glass-card glow-border overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* Close */}
              <button onClick={handleClose} className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="flex items-center gap-2 mb-1">
                  <Rocket className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">Boost Stream</h2>
                </div>
                <p className="text-sm text-muted-foreground truncate">{streamTitle}</p>
              </div>

              {launched ? (
                /* Success */
                <div className="px-6 py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2">Campaign Launched! 🚀</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    ${budget}/day · {duration} days · {platform === "meta" ? "Meta" : "Google"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Total budget: ${budget * duration}
                  </p>
                  <Button variant="hero" onClick={handleClose} className="w-full">Done</Button>
                </div>
              ) : (
                <>
                  {/* Step indicators */}
                  <div className="px-6 py-3 flex gap-1">
                    {[0, 1, 2, 3].map((s) => (
                      <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-secondary"}`} />
                    ))}
                  </div>

                  <div className="px-6 pb-6">
                    <AnimatePresence mode="wait">
                      {/* Step 0: Objective */}
                      {step === 0 && (
                        <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <h3 className="text-sm font-semibold mb-3">Choose Objective</h3>
                          <div className="space-y-2">
                            {objectives.map((obj) => (
                              <button
                                key={obj.id}
                                onClick={() => setObjective(obj.id)}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                                  objective === obj.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30 hover:bg-secondary/30"
                                }`}
                              >
                                <span className="text-2xl">{obj.icon}</span>
                                <div>
                                  <p className="text-sm font-semibold">{obj.label}</p>
                                  <p className="text-xs text-muted-foreground">{obj.desc}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Step 1: Budget + Duration */}
                      {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-primary" /> Daily Budget
                          </h3>
                          <div className="grid grid-cols-4 gap-2 mb-6">
                            {budgetPresets.map((b) => (
                              <button
                                key={b}
                                onClick={() => setBudget(b)}
                                className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                                  budget === b ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                                }`}
                              >
                                ${b}
                              </button>
                            ))}
                          </div>

                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" /> Duration
                          </h3>
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {durationPresets.map((d) => (
                              <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                                  duration === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                                }`}
                              >
                                {d}d
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary/30 border border-border">
                            <span className="text-sm text-muted-foreground">Total Budget</span>
                            <span className="text-lg font-bold text-primary">${budget * duration}</span>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 2: Audience */}
                      {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <AIAudienceSuggestions
                            objective={objective}
                            budget={budget}
                            duration={duration}
                            onApplySuggestion={(suggestion: AISuggestion) => {
                              if (suggestion.audienceId) setAudience(suggestion.audienceId);
                              if (suggestion.budgetRecommendation) setBudget(suggestion.budgetRecommendation);
                              if (suggestion.durationRecommendation) setDuration(suggestion.durationRecommendation);
                            }}
                          />
                          <h3 className="text-sm font-semibold mb-3">Target Audience</h3>
                          <div className="space-y-2">
                            {audiences.map((aud) => (
                              <button
                                key={aud.id}
                                onClick={() => setAudience(aud.id)}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                                  audience === aud.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30 hover:bg-secondary/30"
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                  audience === aud.id ? "bg-primary/15" : "bg-secondary"
                                }`}>
                                  <aud.icon className={`w-4 h-4 ${audience === aud.id ? "text-primary" : "text-muted-foreground"}`} />
                                </div>
                                <span className="text-sm font-medium">{aud.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Platform + Review */}
                      {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <h3 className="text-sm font-semibold mb-3">Launch On</h3>
                          <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                              onClick={() => setPlatform("meta")}
                              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                                platform === "meta" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                              }`}
                            >
                              <span className="text-2xl">📘</span>
                              <span className="text-sm font-semibold">Meta</span>
                            </button>
                            <button
                              onClick={() => setPlatform("google")}
                              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                                platform === "google" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                              }`}
                            >
                              <span className="text-2xl">🔍</span>
                              <span className="text-sm font-semibold">Google</span>
                            </button>
                          </div>

                          {/* Summary */}
                          <div className="rounded-xl bg-secondary/30 border border-border p-4 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Objective</span><span className="font-semibold">{objectives.find((o) => o.id === objective)?.label}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-semibold">${budget}/day × {duration} days = ${budget * duration}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Audience</span><span className="font-semibold">{audiences.find((a) => a.id === audience)?.label}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span className="font-semibold">{platform === "meta" ? "Meta" : "Google"}</span></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex gap-3 mt-6">
                      {step > 0 && (
                        <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
                          Back
                        </Button>
                      )}
                      {step < 3 ? (
                        <Button
                          variant="hero"
                          disabled={!canProceed()}
                          onClick={() => setStep((s) => s + 1)}
                          className="flex-1"
                        >
                          Continue
                        </Button>
                      ) : (
                        <Button
                          variant="hero"
                          disabled={launching}
                          onClick={handleLaunch}
                          className="flex-1"
                        >
                          {launching ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                          ) : (
                            <>
                              <Rocket className="w-4 h-4 mr-2" /> Launch Campaign
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
