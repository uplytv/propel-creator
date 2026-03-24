import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Check, UserPlus, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGuestCoStream } from '@/hooks/useGuestCoStream';
import { useRef, useEffect } from 'react';

interface GuestCoStreamPanelProps {
  streamId: string;
  isHost: boolean;
}

export default function GuestCoStreamPanel({ streamId, isHost }: GuestCoStreamPanelProps) {
  const {
    guestId,
    guestName,
    guestStream,
    isConnected,
    isPending,
    pendingRequests,
    acceptGuest,
    rejectGuest,
    removeGuest,
  } = useGuestCoStream(streamId, isHost);

  const guestVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (guestVideoRef.current && guestStream) {
      guestVideoRef.current.srcObject = guestStream;
    }
  }, [guestStream]);

  if (!isHost) return null;

  return (
    <>
      {/* Pending guest requests */}
      <AnimatePresence>
        {pendingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-28 right-3 z-20 space-y-2"
          >
            {pendingRequests.map(req => (
              <div
                key={req.userId}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {req.avatarUrl ? (
                    <img src={req.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{req.name}</p>
                    <p className="text-[10px] text-white/50">wants to join</p>
                  </div>
                </div>
                <button
                  onClick={() => acceptGuest(req.userId)}
                  className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </button>
                <button
                  onClick={() => rejectGuest(req.userId)}
                  className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected guest PiP */}
      <AnimatePresence>
        {isConnected && guestStream && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-28 left-3 z-20"
          >
            <div className="relative rounded-2xl overflow-hidden border-2 border-primary/50 shadow-xl" style={{ width: 140 }}>
              <video
                ref={guestVideoRef}
                autoPlay
                playsInline
                muted={false}
                className="w-full aspect-[3/4] object-cover"
              />
              <div
                className="absolute bottom-0 inset-x-0 px-2 py-1 flex items-center justify-between"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
              >
                <span className="text-[10px] font-bold text-white truncate">{guestName}</span>
                <button
                  onClick={removeGuest}
                  className="p-1 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <PhoneOff className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending connection indicator */}
      {isPending && !isConnected && (
        <div
          className="absolute top-28 left-3 z-20 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <Phone className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="text-xs text-white/80">Connecting guest...</span>
        </div>
      )}
    </>
  );
}
