import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Check, PhoneOff, MicOff, Mic, Copy, Link, LayoutGrid, Layout, Monitor, UserPlus } from 'lucide-react';
import { useGuestCoStream, type GuestLayout, type Guest } from '@/hooks/useGuestCoStream';
import { toast } from 'sonner';

interface Props {
  streamId: string;
  isHost: boolean;
}

function GuestVideo({ guest }: { guest: Guest }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && guest.stream) videoRef.current.srcObject = guest.stream;
  }, [guest.stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-primary/50 shadow-xl">
      {guest.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full aspect-[3/4] object-cover"
        />
      ) : (
        <div className="w-full aspect-[3/4] flex items-center justify-center" style={{ backgroundColor: 'rgba(10,10,10,0.9)' }}>
          {guest.avatarUrl ? (
            <img src={guest.avatarUrl} alt={guest.name} loading="lazy" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {guest.name[0]}
            </div>
          )}
        </div>
      )}
      <div
        className="absolute bottom-0 inset-x-0 px-2 py-1 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {guest.isMuted && <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />}
          <span className="text-[10px] font-bold text-white truncate">{guest.name}</span>
        </div>
        {!guest.isConnected && (
          <span className="text-[9px] text-white/40 italic">connecting…</span>
        )}
      </div>
    </div>
  );
}

export default function GuestCoStreamPanel({ streamId, isHost }: Props) {
  const {
    guests, connectedGuests, pendingRequests, layout, setLayout,
    acceptGuest, rejectGuest, removeGuest, toggleGuestMute,
    getInviteLink, isFull,
  } = useGuestCoStream(streamId, isHost);

  const [showPanel, setShowPanel] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isHost) return null;

  const copyInviteLink = async () => {
    const link = getInviteLink();
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Invite link copied! Send it to your guest.');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const LAYOUTS: { id: GuestLayout; icon: typeof Layout; label: string }[] = [
    { id: 'pip', icon: Layout, label: 'PiP' },
    { id: 'side-by-side', icon: Monitor, label: 'Side' },
    { id: 'grid', icon: LayoutGrid, label: 'Grid' },
  ];

  return (
    <>
      {/* Toggle Button */}
      <div className="absolute top-3 right-3 z-30">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            backgroundColor: connectedGuests.length > 0 ? 'rgba(61, 124, 255,0.2)' : 'rgba(10,10,10,0.8)',
            border: connectedGuests.length > 0 ? '1px solid #3D7CFF' : '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            color: connectedGuests.length > 0 ? '#3D7CFF' : 'white',
          }}
        >
          <UserPlus className="w-4 h-4" />
          {connectedGuests.length > 0
            ? `${connectedGuests.length} Guest${connectedGuests.length !== 1 ? 's' : ''}`
            : 'Invite'}
          {pendingRequests.length > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Control Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-16 right-3 z-30 w-72 rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-bold text-white">
                Guests {guests.length}/{4}
              </p>
              <button onClick={() => setShowPanel(false)} aria-label="Close guest panel" className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invite Link */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] text-white/40 mb-2">Share this link to invite a guest on screen:</p>
              <button
                onClick={copyInviteLink}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ backgroundColor: 'rgba(61, 124, 255,0.15)', color: '#3D7CFF', border: '1px solid rgba(61, 124, 255,0.3)' }}
              >
                {copiedLink
                  ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                  : <><Copy className="w-3.5 h-3.5" /> Copy Invite Link</>}
              </button>
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Wants to join</p>
                {pendingRequests.map(req => (
                  <div key={req.userId} className="flex items-center gap-2 py-1.5">
                    {req.avatarUrl ? (
                      <img src={req.avatarUrl} alt={req.name} loading="lazy" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <p className="text-xs font-semibold text-white flex-1 truncate">{req.name}</p>
                    <button
                      onClick={() => acceptGuest(req.userId)}
                      disabled={isFull}
                      aria-label="Accept guest"
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ backgroundColor: 'rgba(61, 124, 255,0.2)' }}
                    >
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    </button>
                    <button
                      onClick={() => rejectGuest(req.userId)}
                      aria-label="Reject guest"
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ backgroundColor: 'rgba(239,68,68,0.2)' }}
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* On Screen */}
            {guests.length > 0 && (
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">On Screen</p>
                {guests.map(guest => (
                  <div key={guest.userId} className="flex items-center gap-2 py-1.5">
                    {guest.avatarUrl ? (
                      <img src={guest.avatarUrl} alt={guest.name} loading="lazy" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {guest.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{guest.name}</p>
                      <p
                        className="text-[10px] font-medium"
                        style={{ color: guest.isConnected ? '#3D7CFF' : 'rgba(255,255,255,0.4)' }}
                      >
                        {guest.isConnected ? '● Live' : 'Connecting…'}
                      </p>
                    </div>
                    <button onClick={() => toggleGuestMute(guest.userId)} aria-label={guest.isMuted ? 'Unmute guest' : 'Mute guest'} className="p-1.5 rounded-lg hover:bg-white/10">
                      {guest.isMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-white/60" />}
                    </button>
                    <button onClick={() => removeGuest(guest.userId)} aria-label="Remove guest" className="p-1.5 rounded-lg hover:bg-destructive/20">
                      <PhoneOff className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Layout Picker */}
            {connectedGuests.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Layout</p>
                <div className="flex gap-2">
                  {LAYOUTS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLayout(l.id)}
                      className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all text-[10px] font-semibold"
                      style={{
                        backgroundColor: layout === l.id ? 'rgba(61, 124, 255,0.15)' : 'rgba(255,255,255,0.05)',
                        color: layout === l.id ? '#3D7CFF' : 'rgba(255,255,255,0.5)',
                        border: layout === l.id ? '1px solid #3D7CFF' : '1px solid transparent',
                      }}
                    >
                      <l.icon className="w-4 h-4" />
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest Videos */}
      <AnimatePresence>
        {connectedGuests.length > 0 && (
          <>
            {layout === 'pip' && connectedGuests.map((guest, i) => (
              <motion.div
                key={guest.userId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute z-20"
                style={{ top: 100 + i * 160, left: 12, width: 120 }}
              >
                <GuestVideo guest={guest} />
              </motion.div>
            ))}
            {layout === 'side-by-side' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-0 right-0 z-20 h-full flex flex-col justify-center gap-2 pr-2"
                style={{ width: '30%' }}
              >
                {connectedGuests.map(guest => (
                  <div key={guest.userId} className="flex-1 max-h-[200px]">
                    <GuestVideo guest={guest} />
                  </div>
                ))}
              </motion.div>
            )}
            {layout === 'grid' && connectedGuests.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 grid grid-cols-2 gap-1 p-2"
              >
                {connectedGuests.map(guest => (
                  <div key={guest.userId} className="relative rounded-xl overflow-hidden">
                    <GuestVideo guest={guest} />
                  </div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
