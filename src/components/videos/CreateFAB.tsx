import { useState } from "react";
import { Plus, Radio, Upload, Calendar, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface CreateFABProps {
  onUploadVideo: () => void;
}

export default function CreateFAB({ onUploadVideo }: CreateFABProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { label: "Go Live", icon: Radio, onClick: () => { setOpen(false); navigate("/go-live"); } },
    { label: "Upload Video", icon: Upload, onClick: () => { setOpen(false); onUploadVideo(); } },
    { label: "Schedule Stream", icon: Calendar, onClick: () => { setOpen(false); navigate("/go-live?tab=schedule"); } },
  ];

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action items */}
      <AnimatePresence>
        {open && (
          <div className="fixed bottom-[140px] right-4 z-[61] flex flex-col items-end gap-3 md:hidden">
            {actions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                transition={{ delay: i * 0.06, type: "spring", damping: 25, stiffness: 300 }}
                onClick={action.onClick}
                className="flex items-center gap-3 pl-4 pr-3 py-3 rounded-2xl bg-card border border-border shadow-lg"
              >
                <span className="text-sm font-semibold text-foreground">{action.label}</span>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <action.icon className="w-5 h-5 text-primary-foreground" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-[84px] right-4 z-[61] w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg md:hidden"
        style={{ boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)" }}
        whileTap={{ scale: 0.92 }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {open ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <Plus className="w-6 h-6 text-primary-foreground" />
        )}
      </motion.button>
    </>
  );
}
