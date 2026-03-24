import { motion, AnimatePresence } from 'framer-motion';
import { type Caption } from '@/hooks/useLiveCaptions';

interface LiveCaptionsOverlayProps {
  captions: Caption[];
  interimText: string;
  isActive: boolean;
}

export default function LiveCaptionsOverlay({ captions, interimText, isActive }: LiveCaptionsOverlayProps) {
  if (!isActive) return null;

  return (
    <div className="absolute bottom-20 inset-x-0 z-20 pointer-events-none px-4">
      <div className="max-w-lg mx-auto">
        <AnimatePresence mode="popLayout">
          {captions.map((cap) => (
            <motion.div
              key={cap.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-1 px-3 py-1.5 rounded-lg text-sm text-white font-medium text-center"
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {cap.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {interimText && (
          <div
            className="px-3 py-1.5 rounded-lg text-sm text-white/60 italic text-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            {interimText}
          </div>
        )}
      </div>
    </div>
  );
}
