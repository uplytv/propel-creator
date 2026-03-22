import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={() => {
        setTimeout(onComplete, 1500);
      }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-3"
      >
        <img src={logoImg} alt="UPLY" className="w-20 h-20 object-contain" />
      </motion.div>
    </motion.div>
  );
}
