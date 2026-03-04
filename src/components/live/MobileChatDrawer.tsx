import { Drawer } from "vaul";
import { MessageSquare, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import StreamChat from "./StreamChat";

interface MobileChatDrawerProps {
  isLoggedIn: boolean;
  onTipClick: () => void;
  creditsBalance: number;
}

export default function MobileChatDrawer({ isLoggedIn, onTipClick, creditsBalance }: MobileChatDrawerProps) {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
          style={{ boxShadow: "var(--glow-shadow-strong)" }}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-semibold">Chat</span>
          <ChevronUp className="w-4 h-4 opacity-60" />
        </motion.button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-background/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[91] flex flex-col rounded-t-2xl bg-card border-t border-border outline-none max-h-[85vh]">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex-1 overflow-hidden" style={{ height: "75vh" }}>
            <StreamChat
              isLoggedIn={isLoggedIn}
              onTipClick={onTipClick}
              creditsBalance={creditsBalance}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
