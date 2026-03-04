import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Crown, Shield, Zap, Star, Users, BookOpen, MessageSquare, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface JoinOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  creatorAvatar: string;
  communityPrice: number;
  category: string;
}

export default function JoinOverlay({
  isOpen,
  onClose,
  creatorName,
  creatorAvatar,
  communityPrice,
  category,
}: JoinOverlayProps) {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleJoin = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
    }, 1500);
  };

  const handleClose = () => {
    setSuccess(false);
    onClose();
  };

  const perks = [
    { icon: Video, label: "All live streams & replays" },
    { icon: BookOpen, label: "Full course library" },
    { icon: MessageSquare, label: "Private community chat" },
    { icon: Users, label: "Exclusive member events" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" onClick={handleClose} />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md mx-4"
          >
            {success ? (
              /* Success State */
              <div className="glass-card glow-border p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-10 h-10 text-primary" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold text-foreground mb-2"
                >
                  Welcome to the community! 🎉
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted-foreground mb-6"
                >
                  You're now a member of {creatorName}'s community. Enjoy the stream!
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button variant="hero" size="lg" onClick={handleClose} className="w-full">
                    Back to Stream
                  </Button>
                </motion.div>
              </div>
            ) : (
              /* Join Form */
              <div className="glass-card glow-border overflow-hidden">
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header gradient */}
                <div className="relative px-8 pt-8 pb-6 bg-gradient-to-b from-primary/10 to-transparent">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary/30">
                      {creatorAvatar}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{creatorName}'s Community</h2>
                      <p className="text-sm text-muted-foreground">{category}</p>
                    </div>
                  </div>
                </div>

                {/* Perks */}
                <div className="px-8 py-4 space-y-3">
                  {perks.map((perk) => (
                    <div key={perk.label} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <perk.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">{perk.label}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="px-8 py-6 border-t border-border/50 bg-secondary/20">
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={handleJoin}
                    disabled={processing}
                    className="w-full text-base"
                  >
                    {processing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      />
                    ) : (
                      <>
                        Join Now — ${communityPrice}/month
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center mt-3">
                    Cancel anytime · Instant access · No commitment
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
