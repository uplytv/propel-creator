import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import logoImg from "@/assets/logo.png";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const progress = useMotionValue(0);
  const ringScale = useTransform(progress, [0, 1], [0, 1]);
  const ringOpacity = useTransform(progress, [0, 0.3, 1], [0, 0.6, 0]);

  useEffect(() => {
    // Phase 1: Logo enters (0.8s)
    const enterTimer = setTimeout(() => setPhase("hold"), 800);
    // Phase 2: Hold with ring pulse (0.8s)
    const holdTimer = setTimeout(() => setPhase("exit"), 1600);
    // Phase 3: Exit and complete
    const exitTimer = setTimeout(onComplete, 2200);

    // Animate the ring burst during hold
    const ringTimer = setTimeout(() => {
      animate(progress, 1, { duration: 0.8, ease: "easeOut" });
    }, 700);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(ringTimer);
    };
  }, [onComplete, progress]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: "hsl(260 10% 7%)" }}
      animate={phase === "exit" ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {/* Ambient glow behind logo */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 300,
          height: 300,
          background: "radial-gradient(circle, hsl(145 100% 50% / 0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 0.5, 0.3] }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
      />

      {/* Expanding ring burst */}
      <motion.div
        className="absolute rounded-full border"
        style={{
          width: 160,
          height: 160,
          borderColor: "hsl(145 100% 50% / 0.3)",
          scale: ringScale,
          opacity: ringOpacity,
        }}
      />

      {/* Second ring, slightly delayed */}
      <motion.div
        className="absolute rounded-full border"
        style={{
          width: 220,
          height: 220,
          borderColor: "hsl(145 100% 50% / 0.15)",
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.1], opacity: [0, 0.4, 0] }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.9 }}
      />

      {/* Particle dots */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 80;
        const y = Math.sin(angle) * 80;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 3,
              height: 3,
              background: "hsl(145 100% 50% / 0.6)",
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: [0, x],
              y: [0, y],
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.8 + i * 0.05,
            }}
          />
        );
      })}

      {/* Logo container */}
      <motion.div
        className="relative flex flex-col items-center gap-4"
        initial={{ scale: 0.3, opacity: 0, y: 10 }}
        animate={{
          scale: phase === "exit" ? 1.1 : 1,
          opacity: phase === "exit" ? 0 : 1,
          y: 0,
        }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {/* Logo with subtle breathing glow */}
        <motion.div
          className="relative"
          animate={{
            filter: [
              "drop-shadow(0 0 0px hsl(145 100% 50% / 0))",
              "drop-shadow(0 0 20px hsl(145 100% 50% / 0.3))",
              "drop-shadow(0 0 8px hsl(145 100% 50% / 0.15))",
            ],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            times: [0, 0.5, 1],
          }}
        >
          <img
            src={logoImg}
            alt="UPLY"
            className="w-24 h-24 object-contain"
          />
        </motion.div>

        {/* Wordmark */}
        <motion.p
          className="text-sm font-semibold tracking-[0.3em] uppercase"
          style={{
            color: "hsl(0 0% 100% / 0.5)",
            fontFamily: "Space Grotesk, sans-serif",
          }}
          initial={{ opacity: 0, y: 8, letterSpacing: "0.5em" }}
          animate={{
            opacity: phase === "exit" ? 0 : 0.5,
            y: 0,
            letterSpacing: "0.3em",
          }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        >
          UPLY
        </motion.p>
      </motion.div>

      {/* Bottom tagline */}
      <motion.p
        className="absolute bottom-12 text-[11px] font-medium"
        style={{
          color: "hsl(0 0% 100% / 0.2)",
          fontFamily: "Plus Jakarta Sans, sans-serif",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "exit" ? 0 : 0.2 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        move first
      </motion.p>
    </motion.div>
  );
}
