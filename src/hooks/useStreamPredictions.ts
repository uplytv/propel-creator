import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Prediction {
  id: string;
  question: string;
  options: { label: string; bets: number; credits: number }[];
  status: 'open' | 'locked' | 'resolved';
  winningIndex: number | null;
  createdAt: number;
  locksAt: number;
}

export interface UserBet {
  predictionId: string;
  optionIndex: number;
  amount: number;
}

export function useStreamPredictions(streamId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [creating, setCreating] = useState(false);

  // Subscribe to prediction updates via realtime channel
  useEffect(() => {
    const channel = supabase
      .channel(`predictions-${streamId}`)
      .on('broadcast', { event: 'prediction_update' }, ({ payload }) => {
        if (payload?.prediction) {
          setPredictions(prev => {
            const existing = prev.findIndex(p => p.id === payload.prediction.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = payload.prediction;
              return updated;
            }
            return [...prev, payload.prediction];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  const createPrediction = useCallback(async (
    question: string,
    options: string[],
    durationSeconds: number = 120,
  ) => {
    if (!user) return;
    setCreating(true);

    const prediction: Prediction = {
      id: `pred-${Date.now()}`,
      question,
      options: options.map(label => ({ label, bets: 0, credits: 0 })),
      status: 'open',
      winningIndex: null,
      createdAt: Date.now(),
      locksAt: Date.now() + durationSeconds * 1000,
    };

    setPredictions(prev => [...prev, prediction]);

    // Broadcast to all viewers
    await supabase.channel(`predictions-${streamId}`).send({
      type: 'broadcast',
      event: 'prediction_update',
      payload: { prediction },
    });

    setCreating(false);

    // Auto-lock after duration
    setTimeout(async () => {
      const locked = { ...prediction, status: 'locked' as const };
      setPredictions(prev => prev.map(p => p.id === locked.id ? locked : p));
      await supabase.channel(`predictions-${streamId}`).send({
        type: 'broadcast',
        event: 'prediction_update',
        payload: { prediction: locked },
      });
    }, durationSeconds * 1000);
  }, [user, streamId]);

  const placeBet = useCallback(async (predictionId: string, optionIndex: number, amount: number) => {
    if (!user) return;

    const pred = predictions.find(p => p.id === predictionId);
    if (!pred || pred.status !== 'open') {
      toast({ title: 'Betting is closed', variant: 'destructive' });
      return;
    }

    // Check wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.credits < amount) {
      toast({ title: 'Insufficient credits', variant: 'destructive' });
      return;
    }

    // Deduct from wallet
    await supabase
      .from('wallets')
      .update({ credits: wallet.credits - amount })
      .eq('user_id', user.id);

    setUserBets(prev => [...prev, { predictionId, optionIndex, amount }]);

    // Update prediction state
    const updated = { ...pred };
    updated.options = updated.options.map((o, i) =>
      i === optionIndex ? { ...o, bets: o.bets + 1, credits: o.credits + amount } : o
    );
    setPredictions(prev => prev.map(p => p.id === predictionId ? updated : p));

    await supabase.channel(`predictions-${streamId}`).send({
      type: 'broadcast',
      event: 'prediction_update',
      payload: { prediction: updated },
    });

    toast({ title: `🎰 Bet ${amount} credits on "${updated.options[optionIndex].label}"` });
  }, [user, predictions, streamId, toast]);

  const resolvePrediction = useCallback(async (predictionId: string, winningIndex: number) => {
    const pred = predictions.find(p => p.id === predictionId);
    if (!pred) return;

    const resolved: Prediction = { ...pred, status: 'resolved', winningIndex };
    setPredictions(prev => prev.map(p => p.id === predictionId ? resolved : p));

    // Calculate payouts - winners split the total pool proportionally
    const totalPool = pred.options.reduce((sum, o) => sum + o.credits, 0);
    const winningPool = pred.options[winningIndex].credits;

    if (winningPool > 0 && totalPool > 0) {
      const multiplier = totalPool / winningPool;
      // In a real system, this would be handled server-side
      toast({
        title: `🏆 "${pred.options[winningIndex].label}" wins!`,
        description: `${multiplier.toFixed(1)}x payout to winners`,
      });
    }

    await supabase.channel(`predictions-${streamId}`).send({
      type: 'broadcast',
      event: 'prediction_update',
      payload: { prediction: resolved },
    });
  }, [predictions, streamId, toast]);

  return {
    predictions,
    userBets,
    creating,
    createPrediction,
    placeBet,
    resolvePrediction,
  };
}
