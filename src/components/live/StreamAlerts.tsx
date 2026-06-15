import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface StreamAlert {
  id: string;
  type: 'tip' | 'subscriber' | 'milestone' | 'raid';
  title: string;
  message: string;
  emoji: string;
  amount?: number;
}

interface StreamAlertsProps {
  className?: string;
}

// Singleton alert queue
const alertQueue: StreamAlert[] = [];
let alertListener: (() => void) | null = null;

export function pushStreamAlert(alert: Omit<StreamAlert, 'id'>) {
  alertQueue.push({ ...alert, id: `alert-${Date.now()}-${Math.random()}` });
  alertListener?.();
}

/**
 * Full-screen animated alerts overlay for tips, new subs, milestones, and raids.
 * Renders animated overlays like Streamlabs.
 */
export default function StreamAlerts({ className }: StreamAlertsProps) {
  const [currentAlert, setCurrentAlert] = useState<StreamAlert | null>(null);

  const processQueue = useCallback(() => {
    if (currentAlert || alertQueue.length === 0) return;
    const next = alertQueue.shift()!;
    setCurrentAlert(next);
    setTimeout(() => {
      setCurrentAlert(null);
      // Process next after animation
      setTimeout(() => processQueue(), 300);
    }, 4000);
  }, [currentAlert]);

  useEffect(() => {
    alertListener = processQueue;
    return () => { alertListener = null; };
  }, [processQueue]);

  useEffect(() => {
    if (!currentAlert) processQueue();
  }, [currentAlert, processQueue]);

  const alertStyles: Record<string, { bg: string; border: string; glow: string }> = {
    tip: {
      bg: 'rgba(234, 179, 8, 0.15)',
      border: 'rgba(234, 179, 8, 0.4)',
      glow: '0 0 60px rgba(234, 179, 8, 0.3)',
    },
    subscriber: {
      bg: 'rgba(99, 102, 241, 0.15)',
      border: 'rgba(99, 102, 241, 0.4)',
      glow: '0 0 60px rgba(99, 102, 241, 0.3)',
    },
    milestone: {
      bg: 'rgba(61, 124, 255, 0.12)',
      border: 'rgba(61, 124, 255, 0.4)',
      glow: '0 0 60px rgba(61, 124, 255, 0.3)',
    },
    raid: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.4)',
      glow: '0 0 60px rgba(239, 68, 68, 0.3)',
    },
  };

  return (
    <div className={`absolute inset-0 pointer-events-none z-30 flex items-center justify-center ${className || ''}`}>
      <AnimatePresence>
        {currentAlert && (
          <motion.div
            key={currentAlert.id}
            initial={{ scale: 0.3, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="relative px-8 py-6 rounded-2xl text-center max-w-sm mx-4"
            style={{
              backgroundColor: alertStyles[currentAlert.type]?.bg,
              border: `1px solid ${alertStyles[currentAlert.type]?.border}`,
              boxShadow: alertStyles[currentAlert.type]?.glow,
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Emoji burst */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5, times: [0, 0.6, 1] }}
              className="text-5xl mb-3"
            >
              {currentAlert.emoji}
            </motion.div>

            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-bold text-white mb-1"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              {currentAlert.title}
            </motion.h3>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm text-white/80"
            >
              {currentAlert.message}
            </motion.p>

            {currentAlert.amount !== undefined && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-2 inline-block px-4 py-1.5 rounded-full font-bold text-sm"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: 'hsl(var(--warning))',
                }}
              >
                {currentAlert.amount} credits
              </motion.div>
            )}

            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
                initial={{
                  x: 0, y: 0, opacity: 1,
                  top: '50%', left: '50%',
                }}
                animate={{
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200,
                  opacity: 0,
                  scale: [1, 2, 0],
                }}
                transition={{ duration: 1.5, delay: 0.2 + i * 0.1 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
