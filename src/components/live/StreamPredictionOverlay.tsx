import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Lock, Check, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { Prediction } from "@/hooks/useStreamPredictions";

interface StreamPredictionOverlayProps {
  predictions: Prediction[];
  isCreator: boolean;
  onPlaceBet: (predictionId: string, optionIndex: number, amount: number) => void;
  onResolve: (predictionId: string, winningIndex: number) => void;
  userBets: Array<{ predictionId: string; optionIndex: number; amount: number }>;
}

export default function StreamPredictionOverlay({
  predictions,
  isCreator,
  onPlaceBet,
  onResolve,
  userBets,
}: StreamPredictionOverlayProps) {
  const [betAmounts, setBetAmounts] = useState<Record<string, number>>({});
  const activePredictions = predictions.filter(p => p.status !== 'resolved' || Date.now() - p.createdAt < 30000);

  if (!activePredictions.length) return null;

  return (
    <div className="absolute top-16 right-3 z-30 w-72 space-y-2">
      <AnimatePresence>
        {activePredictions.map(pred => {
          const totalCredits = pred.options.reduce((s, o) => s + o.credits, 0);
          const userBet = userBets.find(b => b.predictionId === pred.id);
          const timeLeft = Math.max(0, Math.floor((pred.locksAt - Date.now()) / 1000));

          return (
            <motion.div
              key={pred.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="bg-background/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-bold text-foreground flex-1 truncate">{pred.question}</p>
                {pred.status === 'open' && (
                  <span className="flex items-center gap-1 text-[10px] text-primary">
                    <Clock className="w-3 h-3" /> {timeLeft}s
                  </span>
                )}
                {pred.status === 'locked' && <Lock className="w-3 h-3 text-muted-foreground" />}
                {pred.status === 'resolved' && <Check className="w-3 h-3 text-green-400" />}
              </div>

              <div className="space-y-1.5">
                {pred.options.map((opt, i) => {
                  const pct = totalCredits > 0 ? Math.round((opt.credits / totalCredits) * 100) : 0;
                  const isWinner = pred.winningIndex === i;
                  const isBetted = userBet?.optionIndex === i;

                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[11px] ${isWinner ? 'text-green-400 font-bold' : isBetted ? 'text-primary font-semibold' : 'text-foreground'}`}>
                          {isWinner && '🏆 '}{opt.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{opt.credits}c ({pct}%)</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />

                      {pred.status === 'resolved' && isCreator && isWinner && null}
                      {pred.status === 'open' && !userBet && !isCreator && (
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="number"
                            min={1}
                            placeholder="Credits"
                            className="h-6 text-[10px] w-16"
                            value={betAmounts[`${pred.id}-${i}`] || ''}
                            onChange={e => setBetAmounts(prev => ({
                              ...prev,
                              [`${pred.id}-${i}`]: Number(e.target.value),
                            }))}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2"
                            onClick={() => onPlaceBet(pred.id, i, betAmounts[`${pred.id}-${i}`] || 10)}
                          >
                            <Coins className="w-3 h-3 mr-1" /> Bet
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Creator resolve buttons */}
              {isCreator && pred.status === 'locked' && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">Select winner:</p>
                  <div className="flex gap-1">
                    {pred.options.map((opt, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] flex-1"
                        onClick={() => onResolve(pred.id, i)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {userBet && (
                <p className="text-[10px] text-primary mt-1">
                  You bet {userBet.amount}c on "{pred.options[userBet.optionIndex].label}"
                </p>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
