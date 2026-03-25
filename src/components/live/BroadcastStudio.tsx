import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Camera,
  Settings,
  Copy,
  Check,
  Eye,
  EyeOff,
  Radio,
  RotateCcw,
  Volume2,
  Circle,
  Square,
  Upload,
  Send,
  Wifi,
  WifiOff,
  AlertCircle,
  ShoppingBag,
  X,
  ChevronDown,
  Maximize,
  Minimize,
  Zap,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CreatorVideoOverlay, CreatorDashboardPanel } from "./CreatorStreamOverlay";
import { useStreamEngagement } from "@/hooks/useStreamEngagement";
import SharePanel from "@/components/share/SharePanel";
import { getSiteUrl } from "@/lib/siteUrl";
import { clearChunks, appendChunk, getAllChunks } from "@/lib/recordingStore";
import { ICE_SERVERS, getRecorderOptions, getCameraConstraints } from "@/lib/webrtcConfig";
import { useAdaptiveBitrate } from "@/hooks/useAdaptiveBitrate";
import { useBroadcasterHealth } from "@/hooks/useBroadcasterHealth";
import { useStreamAutoRecovery } from "@/hooks/useStreamAutoRecovery";
import {
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
} from "lucide-react";
import { enableSimulcast } from "@/lib/simulcast";
import { useStreamAnalytics } from "@/hooks/useStreamAnalytics";
import { useVirtualBackground } from "@/hooks/useVirtualBackground";
import { useStreamHighlights } from "@/hooks/useStreamHighlights";
import { useLiveCaptions } from "@/hooks/useLiveCaptions";
import { useRaidSystem } from "@/hooks/useRaidSystem";
import { useVODChapters } from "@/hooks/useVODChapters";
import { useStreamPredictions } from "@/hooks/useStreamPredictions";
import { useCreatorSoundboard } from "@/hooks/useCreatorSoundboard";
import { useLiveAuction } from "@/hooks/useLiveAuction";
import { useCollaborativeWhiteboard } from "@/hooks/useCollaborativeWhiteboard";
import { useStreamOverlayThemes } from "@/hooks/useStreamOverlayThemes";
import { useViewerHeatmap } from "@/hooks/useViewerHeatmap";
import { useLiveQuiz } from "@/hooks/useLiveQuiz";
import { useViewerSentiment } from "@/hooks/useViewerSentiment";
import { LivePollOverlay } from "./LivePollOverlay";
import GuestCoStreamPanel from "./GuestCoStreamPanel";
import StreamAnalyticsPanel from "./StreamAnalyticsPanel";
import StreamAlerts, { pushStreamAlert } from "./StreamAlerts";
import LiveCaptionsOverlay from "./LiveCaptionsOverlay";
import RaidOverlay from "./RaidOverlay";
import HighlightsReel from "./HighlightsReel";
import DonationGoalOverlay from "./DonationGoalOverlay";
import StreamPredictionOverlay from "./StreamPredictionOverlay";
import CreatorSoundboard from "./CreatorSoundboard";
import LiveAuctionOverlay from "./LiveAuctionOverlay";
import WhiteboardOverlay from "./WhiteboardOverlay";
import OverlayThemePicker from "./OverlayThemePicker";
import ViewerHeatmapPanel from "./ViewerHeatmapPanel";
import ViewerSentimentOverlay from "./ViewerSentimentOverlay";
import { LiveQuizOverlay, QuizCreatorPanel } from "./LiveQuizOverlay";
import { BarChart3, MessageCircleQuestion, UserPlus, Sparkles, Subtitles, Swords, Target, Gamepad2, Music, Gavel, PenTool, Palette, Brain, SmilePlus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  image_url?: string | null;
  status: string;
}

interface BroadcastStudioProps {
  streamData: {
    streamId: string;
    streamKey: string;
    playbackId: string;
    rtmpUrl: string;
  };
  streamStatus: string;
  title: string;
  onEndStream: (info?: { muxAssetId?: string; durationSeconds?: number }) => void;
  products?: Product[];
  featuredProductId?: string | null;
  onFeaturedProductChange?: (productId: string | null) => void;
  creatorUsername?: string | null;
}

function FeaturedProductPicker({
  products,
  featuredProductId,
  onSelect,
}: {
  products: Product[];
  featuredProductId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const selected = products.find((p) => p.id === featuredProductId);
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Featured Product</span>
        </div>
        {selected && (
          <button
            onClick={() => onSelect?.(null)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {selected ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all text-left">
              {selected.image_url ? (
                <img src={selected.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm">
                  {selected.type === 'course' ? '📚' : selected.type === 'community' ? '🤝' : selected.type === 'coaching' ? '🎯' : '📦'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{selected.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{selected.type} · ${selected.price}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <p className="text-xs font-semibold text-foreground px-2 py-1.5">Switch Product</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onSelect?.(p.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
                    p.id === featuredProductId ? 'bg-primary/10' : 'hover:bg-secondary'
                  }`}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs">
                      {p.type === 'course' ? '📚' : p.type === 'community' ? '🤝' : p.type === 'coaching' ? '🎯' : '📦'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{p.type} · ${p.price}</p>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-xs text-muted-foreground">
              <ShoppingBag className="w-3.5 h-3.5" />
              Select a product to feature
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <p className="text-xs font-semibold text-foreground px-2 py-1.5">Feature a Product</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onSelect?.(p.id); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-secondary transition-colors"
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs">
                      {p.type === 'course' ? '📚' : p.type === 'community' ? '🤝' : p.type === 'coaching' ? '🎯' : '📦'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{p.type} · ${p.price}</p>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

type StudioMode = "select" | "browser-record" | "external-encoder";

export default function BroadcastStudio({
  streamData,
  streamStatus,
  title,
  onEndStream,
  products = [],
  featuredProductId,
  onFeaturedProductChange,
  creatorUsername,
}: BroadcastStudioProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const webrtcChannelRef = useRef<any>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const [studioMode, setStudioMode] = useState<StudioMode>("select");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [uploadErrorMsg, setUploadErrorMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRecordingDuration, setLastRecordingDuration] = useState(0);
  const [lastUploadId, setLastUploadId] = useState<string | null>(null);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const [liveChatInput, setLiveChatInput] = useState("");
  const [liveChatProfile, setLiveChatProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showRaidPicker, setShowRaidPicker] = useState(false);
  const endStreamDebounceRef = useRef(false);

  // Stream analytics (real-time dashboard)
  const streamAnalytics = useStreamAnalytics(streamData.streamId, isRecording);

  // Virtual background
  const virtualBg = useVirtualBackground(streamRef, videoRef);

  // Stream highlights tracking
  const highlights = useStreamHighlights();

  // Live captions (speech-to-text)
  const captions = useLiveCaptions();

  // Raid system
  const raidSystem = useRaidSystem(streamData.streamId, true);

  // VOD chapters
  const vodChapters = useVODChapters();

  // Stream predictions
  const predictions = useStreamPredictions(streamData.streamId);

  // Creator soundboard
  const soundboard = useCreatorSoundboard();

  // Live auction
  const liveAuction = useLiveAuction(streamData.streamId, true);

  // Collaborative whiteboard
  const whiteboard = useCollaborativeWhiteboard();

  // Overlay themes
  const overlayThemes = useStreamOverlayThemes();

  // Viewer heatmap
  const viewerHeatmap = useViewerHeatmap(streamData.streamId);

  // Live quiz
  const liveQuiz = useLiveQuiz(streamData.streamId, true);

  // Viewer sentiment
  const sentiment = useViewerSentiment(streamData.streamId);

  const [showPredictionCreator, setShowPredictionCreator] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [predQuestion, setPredQuestion] = useState("");
  const [predOptions, setPredOptions] = useState(["", ""]);

  // Load profile for live chat
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setLiveChatProfile(data); });
  }, [user]);

  const handleLiveChatSend = async () => {
    if (!user || !liveChatProfile || !liveChatInput.trim()) return;
    await engagement.sendChatMessage(user.id, liveChatProfile.display_name || "Creator", liveChatProfile.avatar_url, liveChatInput);
    setLiveChatInput("");
  };

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const el = videoContainerRef.current as any;
    if (!el) return;
    const fullscreenEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (fullscreenEl) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    } else if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      const tryNative = el.requestFullscreen
        ? el.requestFullscreen()
        : el.webkitRequestFullscreen
        ? Promise.resolve(el.webkitRequestFullscreen())
        : Promise.reject();

      tryNative.catch(() => {
        setIsFullscreen(true);
      });
    }
  }, [isFullscreen]);

  // Sync fullscreen state + Escape key
  useEffect(() => {
    const handler = () => setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [isFullscreen]);

  // Stream engagement — wire chat messages to analytics counter
  const engagement = useStreamEngagement(streamData.streamId, user?.id || "", streamAnalytics.incrementChat);
  const [coachingNudge, setCoachingNudge] = useState<string | null>(null);
  const prevEnergyRef = useRef(0);

  // Adaptive bitrate (adjusts quality based on network)
  const adaptiveBitrate = useAdaptiveBitrate(peerConnectionsRef, streamRef, isRecording);

  // Broadcaster health monitoring (upload speed, dropped frames)
  const broadcasterHealth = useBroadcasterHealth(peerConnectionsRef, isRecording);

  // Stream auto-recovery (reconnects camera/mic if they drop)
  const autoRecovery = useStreamAutoRecovery(streamRef, videoRef, () => {
    // When track is restored, re-push to all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      if (!streamRef.current) return;
      streamRef.current.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        }
      });
    });
  });

  useEffect(() => {
    if (isRecording) {
      const cleanup = engagement.startEnergyBroadcast();
      autoRecovery.startMonitoring(facingMode);
      return () => {
        cleanup();
        autoRecovery.stopMonitoring();
      };
    }
  }, [isRecording, engagement.startEnergyBroadcast, autoRecovery.startMonitoring, autoRecovery.stopMonitoring, facingMode]);

  useEffect(() => {
    const score = engagement.energyScore;
    if (score >= 100 && prevEnergyRef.current < 100) {
      setCoachingNudge("⚡ You're going viral right now.");
      setTimeout(() => setCoachingNudge(null), 4000);
    } else if (score >= 75 && prevEnergyRef.current < 75) {
      setCoachingNudge("🔥 Keep pushing — chat is on fire.");
      setTimeout(() => setCoachingNudge(null), 4000);
    }
    prevEnergyRef.current = score;
  }, [engagement.energyScore]);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment" = facingMode) => {
    stopCurrentStream();
    setMediaError(null);
    try {
      const constraints = getCameraConstraints(facing);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
      setMicOn(true);
      setScreenShare(false);
      setupAudioAnalyser(stream);
    } catch (err: any) {
      setMediaError("Camera access denied. Please allow camera & mic permissions.");
      setCameraOn(false);
      setMicOn(false);
    }
  }, [facingMode, stopCurrentStream]);

  const startScreenShare = useCallback(async () => {
    stopCurrentStream();
    setMediaError(null);
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getAudioTracks().forEach((t) => screenStream.addTrack(t));
      } catch { /* mic optional */ }

      streamRef.current = screenStream;
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
      }
      setCameraOn(false);
      setMicOn(true);
      setScreenShare(true);
      setupAudioAnalyser(screenStream);

      // If user stops screen share via browser UI, end the recording cleanly
      screenStream.getVideoTracks()[0].onended = () => {
        handleEndStream();
      };
    } catch {
      setMediaError("Screen share cancelled or not supported.");
      setScreenShare(false);
    }
  }, [stopCurrentStream]);

  const setupAudioAnalyser = (stream: MediaStream) => {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
      setAudioLevel(Math.min(avg / 128, 1));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleCamera = () => {
    if (cameraOn) {
      stopCurrentStream();
      setCameraOn(false);
      setMicOn(false);
    } else {
      startCamera();
    }
  };

  const flipCamera = useCallback(async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);

    if (!cameraOn || !streamRef.current) return;

    if (isRecording || peerConnectionsRef.current.size > 0) {
      try {
        const newVideoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: next },
          audio: false,
        });
        const newVideoTrack = newVideoStream.getVideoTracks()[0];
        const oldVideoTrack = streamRef.current.getVideoTracks()[0];

        if (oldVideoTrack) {
          streamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        streamRef.current.addTrack(newVideoTrack);

        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }

        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          }
        });
      } catch (err) {
        console.error('Failed to flip camera seamlessly:', err);
        setMediaError("Could not switch camera.");
      }
    } else {
      startCamera(next);
    }
  }, [facingMode, cameraOn, isRecording, startCamera]);

  // Set stream status in DB
  const setStreamActive = async (active: boolean) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('mux_live_streams')
        .update({
          status: active ? 'active' : 'idle',
          stream_type: 'browser',
          updated_at: now,
          ...(active ? { started_at: now } : { ended_at: now }),
        })
        .eq('id', streamData.streamId);
      if (error) console.error('Failed to update stream status:', error);
    } catch (err) {
      console.error('Failed to update stream status:', err);
    }
  };

  // WebRTC host — uses shared optimized config

  const startWebRTCHost = useCallback(() => {
    const channel = supabase.channel(`webrtc-${streamData.streamId}`, {
      config: { broadcast: { self: false } },
    });

    webrtcChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'viewer-join' }, async (payload: any) => {
        const { viewerId, offer } = payload.payload;
        if (!streamRef.current || !offer) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current.set(viewerId, pc);

        streamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, streamRef.current!);
        });

        // Enable simulcast for per-viewer adaptive quality
        enableSimulcast(pc);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: {
                viewerId,
                from: 'host',
                candidate: event.candidate.toJSON(),
              },
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            pc.close();
            peerConnectionsRef.current.delete(viewerId);
          }
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'host-answer',
            payload: {
              viewerId,
              answer: pc.localDescription?.toJSON(),
            },
          });
        } catch (err) {
          console.error('WebRTC host: failed to handle viewer join:', err);
          pc.close();
          peerConnectionsRef.current.delete(viewerId);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload: any) => {
        const { viewerId, from, candidate } = payload.payload;
        if (from !== 'viewer') return;

        const pc = peerConnectionsRef.current.get(viewerId);
        if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('WebRTC host: failed to add ICE candidate:', err);
          }
        }
      })
      .subscribe();
  }, [streamData.streamId]);

  const stopWebRTCHost = useCallback(() => {
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    if (webrtcChannelRef.current) {
      supabase.removeChannel(webrtcChannelRef.current);
      webrtcChannelRef.current = null;
    }
  }, []);

  // Recording — uses optimized codec/bitrate settings
  const startRecording = async () => {
    if (!streamRef.current) return;
    await clearChunks();
    chunksRef.current = [];
    const { mimeType, videoBitsPerSecond } = getRecorderOptions();
    const recorder = new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        appendChunk(e.data).catch((err) =>
          console.error("[Recording] Failed to persist chunk:", err)
        );
      }
    };
    recorder.onstop = () => {};
    // Use 5-second timeslice to reduce chunk count for long recordings
    recorder.start(5000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingDuration(0);
    highlights.start();
    vodChapters.start();
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);

    await setStreamActive(true);
    startWebRTCHost();
  };

  // The main "end stream" handler — called from the End Stream button or screen share ending
  const handleEndStream = useCallback(async () => {
    // Debounce: prevent double-tap
    if (endStreamDebounceRef.current) return;
    endStreamDebounceRef.current = true;
    setTimeout(() => { endStreamDebounceRef.current = false; }, 500);
    const duration = recordingDuration;
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setShowEndConfirm(false);

    // Stop WebRTC
    stopWebRTCHost();

    // Mark stream as idle
    await setStreamActive(false);

    // Stop recorder and flush chunks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      await new Promise<void>((resolve) => {
        mediaRecorderRef.current!.onstop = () => resolve();
        mediaRecorderRef.current!.stop();
      });
    }

    // Stop media tracks
    stopCurrentStream();

    // Retrieve all chunks from IndexedDB
    const persistedChunks = await getAllChunks();
    if (persistedChunks.length === 0) {
      // No data captured — silently transition to end screen without error
      onEndStream({ durationSeconds: duration });
      return;
    }

    // Upload in background, then transition to end screen
    if (!user) {
      onEndStream({ durationSeconds: duration });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadFailed(false);

    try {
      const blob = new Blob(persistedChunks, { type: "video/webm" });
      const { uploadToMuxWithRetry } = await import("@/lib/muxUpload");
      const uploadId = await uploadToMuxWithRetry({
        userId: user.id,
        title: `${title} (Recording)`,
        description: "Browser recording",
        isPublic: true,
        file: blob,
        onProgress: (pct) => setUploadProgress(pct),
      });
      setLastUploadId(uploadId || null);
      toast({ title: "Recording saved! 🎬", description: "Your video is processing." });
      // Clear IndexedDB after successful upload
      await clearChunks();
      chunksRef.current = [];
      setIsUploading(false);
      // Transition to EndOfStreamScreen via parent
      onEndStream({ muxAssetId: uploadId || undefined, durationSeconds: duration });
    } catch (err: any) {
      console.error("[BroadcastStudio] Upload FAILED", err);
      setUploadFailed(true);
      setUploadErrorMsg(err.message || "Upload failed");
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setIsUploading(false);
      // Still go to end screen so user isn't stuck
      onEndStream({ durationSeconds: duration });
    }
  }, [recordingDuration, stopWebRTCHost, stopCurrentStream, user, title, onEndStream, toast]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const copyToClipboard = async (text: string, field: string) => {
    const ok = await safeClipboardWrite(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      toast({ title: "Could not copy", description: "Please copy manually", variant: "destructive" });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    const sid = streamData.streamId;
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      if (webrtcChannelRef.current) {
        supabase.removeChannel(webrtcChannelRef.current);
        webrtcChannelRef.current = null;
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
      supabase
        .from('mux_live_streams')
        .update({ status: 'idle', ended_at: new Date().toISOString() })
        .eq('id', sid)
        .then(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamData.streamId]);

  const isLive = streamStatus === "active";

  // Re-attach stream to video element after state-driven re-renders (e.g. isRecording toggling)
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  // Safe clipboard helper
  const safeClipboardWrite = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for non-secure contexts or unfocused windows
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Mode selection screen
  if (studioMode === "select") {
    return (
      <div className="space-y-4">
        <div className="glass-card p-5 text-center">
          <Radio className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground mb-1">Choose Your Broadcast Method</h3>
          <p className="text-xs text-muted-foreground">How would you like to create content?</p>
        </div>

        <button
          onClick={() => { setStudioMode("browser-record"); startCamera(); }}
          className="glass-card p-5 w-full text-left hover:border-primary/40 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">Record from Browser</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use your camera or screen to record a video. It will be saved to your content library when you stop.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">No OBS needed</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Saves to library</span>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setStudioMode("external-encoder")}
          className="glass-card p-5 w-full text-left hover:border-primary/40 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
              <Wifi className="w-6 h-6 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">Go Live with OBS / Encoder</p>
              <p className="text-xs text-muted-foreground mt-1">
                Stream live to your audience using OBS, Streamyard, or any RTMP encoder.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Live to audience</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Auto-recorded</span>
              </div>
            </div>
          </div>
        </button>

        <Button variant="ghost" size="sm" onClick={() => onEndStream()} className="w-full text-muted-foreground">
          ← Go Back
        </Button>
      </div>
    );
  }

  // Browser recording mode — IMMERSIVE LIVE VIEW
  if (studioMode === "browser-record") {
    if (isRecording || isUploading) {
      return (
        <>
          <div className="fixed inset-0 z-[80] bg-black flex flex-col">
            {/* Full-screen video */}
            <div
              ref={videoContainerRef}
              className="relative flex-1 overflow-hidden"
            >
              {isUploading ? (
                /* Upload progress overlay */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-30">
                  <Upload className="w-10 h-10 text-primary animate-bounce" />
                  <p className="text-lg font-bold text-white">Saving your stream…</p>
                  <div className="w-48 h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-white/60">{uploadProgress}% complete</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Top bar — LIVE indicator */}
                  <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
                    <div
                      className="pointer-events-auto mx-3 mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl"
                      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(16px)" }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.3)" }}>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                          <span className="text-[11px] font-mono font-bold text-red-400">LIVE</span>
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-white/70">{formatDuration(recordingDuration)}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-white/60" />
                          <span className="text-[11px] font-semibold text-white">{engagement.viewerCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" style={{ color: "#00FF85" }} />
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: "#00FF85" }}
                              animate={{ width: `${engagement.energyScore}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Broadcaster Health Indicator */}
                  <div className="absolute top-16 right-3 z-20 pointer-events-none">
                    <div
                      className="pointer-events-auto flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}
                    >
                      {/* Upload speed */}
                      <div className="flex items-center gap-1">
                        <ArrowUpCircle className="w-3 h-3 text-white/60" />
                        <span className="text-[10px] font-mono text-white/80">
                          {broadcasterHealth.uploadSpeedMbps.toFixed(1)} Mbps
                        </span>
                      </div>
                      <div className="w-px h-3 bg-white/20" />
                      {/* Quality indicator */}
                      <div className="flex items-center gap-1">
                        {broadcasterHealth.quality === 'excellent' ? (
                          <Signal className="w-3 h-3 text-green-400" />
                        ) : broadcasterHealth.quality === 'good' ? (
                          <SignalHigh className="w-3 h-3 text-green-400" />
                        ) : broadcasterHealth.quality === 'fair' ? (
                          <SignalMedium className="w-3 h-3 text-yellow-400" />
                        ) : (
                          <SignalLow className="w-3 h-3 text-red-400" />
                        )}
                        <span className={`text-[10px] font-mono font-semibold ${
                          broadcasterHealth.quality === 'excellent' || broadcasterHealth.quality === 'good' ? 'text-green-400' :
                          broadcasterHealth.quality === 'fair' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {broadcasterHealth.quality.toUpperCase()}
                        </span>
                      </div>
                      {/* Dropped frames warning */}
                      {broadcasterHealth.dropRate > 0.03 && (
                        <>
                          <div className="w-px h-3 bg-white/20" />
                          <span className="text-[10px] font-mono text-red-400">
                            {broadcasterHealth.droppedFrames} drops
                          </span>
                        </>
                      )}
                      {/* ABR level */}
                      {adaptiveBitrate.currentLevel !== 'high' && (
                        <>
                          <div className="w-px h-3 bg-white/20" />
                          <span className="text-[10px] font-mono text-yellow-400">
                            {adaptiveBitrate.currentLevel === 'medium' ? '480p' : '360p'}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Auto-recovery banner */}
                    {autoRecovery.isRecovering && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: "rgba(234,179,8,0.2)", backdropFilter: "blur(8px)" }}
                      >
                        <Activity className="w-3 h-3 text-yellow-400 animate-pulse" />
                        <span className="text-[10px] font-semibold text-yellow-400">Reconnecting stream...</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Coaching nudge */}
                  <AnimatePresence>
                    {coachingNudge && (
                      <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="absolute top-16 inset-x-0 z-20 pointer-events-none mx-auto w-fit rounded-xl px-4 py-2 text-xs font-bold text-center"
                        style={{ backgroundColor: "rgba(0,255,133,0.15)", color: "#00FF85", backdropFilter: "blur(12px)" }}
                      >
                        {coachingNudge}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Floating chat messages */}
                  <div className="absolute bottom-28 left-0 right-16 z-10 pointer-events-none px-3">
                    <div className="flex flex-col gap-1 max-h-[35vh] overflow-hidden">
                      <AnimatePresence initial={false}>
                        {engagement.chatMessages.slice(-8).map((msg) => {
                          const isCreator = msg.user_id === user?.id;
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="text-[13px] leading-tight"
                              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                            >
                              <span className="font-bold" style={{ color: isCreator ? "#FFD700" : "#00FF85" }}>
                                {isCreator && "⭐ "}{msg.username}
                              </span>
                              <span className="text-white/90 ml-1.5">{msg.message}</span>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right-side action buttons */}
                  <div className="absolute right-3 bottom-28 z-20 flex flex-col gap-3 items-center">
                    {/* All buttons use min-w-[44px] min-h-[44px] for accessible tap targets */}
                    <button
                      onClick={async () => {
                        const liveUrl = `${getSiteUrl()}/stream/${streamData.streamId}`;
                        const ok = await safeClipboardWrite(liveUrl);
                        if (ok) {
                          toast({ title: "Live link copied ✓", description: liveUrl });
                        } else {
                          toast({ title: "Could not copy link", variant: "destructive" });
                        }
                      }}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <Copy className="w-4.5 h-4.5 text-white" />
                    </button>
                    <button
                      onClick={() => setShowSharePanel(true)}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(0,255,133,0.25)", backdropFilter: "blur(8px)" }}
                    >
                      <Share2 className="w-4.5 h-4.5 text-white" />
                    </button>
                    <button
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: showAnalytics ? "rgba(0,255,133,0.3)" : "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <BarChart3 className="w-4.5 h-4.5 text-white" />
                    </button>
                    <button
                      onClick={() => setShowPollCreator(true)}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <MessageCircleQuestion className="w-4.5 h-4.5 text-white" />
                    </button>
                    <button
                      onClick={() => captions.toggle()}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: captions.isActive ? "rgba(0,255,133,0.3)" : "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <Subtitles className="w-4.5 h-4.5 text-white" />
                    </button>
                    <button
                      onClick={() => { raidSystem.fetchTargets(); setShowRaidPicker(!showRaidPicker); }}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: showRaidPicker ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <Swords className="w-4.5 h-4.5 text-white" />
                    </button>
                    {/* Predictions button */}
                    <button
                      onClick={() => setShowPredictionCreator(!showPredictionCreator)}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: showPredictionCreator ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <Gamepad2 className="w-4.5 h-4.5 text-white" />
                    </button>
                    {/* Whiteboard */}
                    <button
                      onClick={() => whiteboard.toggle()}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: whiteboard.state.isActive ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <PenTool className="w-4.5 h-4.5 text-white" />
                    </button>
                    {/* Theme picker */}
                    <button
                      onClick={() => setShowThemePicker(!showThemePicker)}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: showThemePicker ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <Palette className="w-4.5 h-4.5 text-white" />
                    </button>
                    <button
                      onClick={() => virtualBg.toggleEffect(virtualBg.effect === 'blur' ? 'none' : 'blur')}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: virtualBg.effect !== 'none' ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <Sparkles className="w-4.5 h-4.5 text-white" />
                    </button>
                    <button
                      onClick={flipCamera}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <RotateCcw className="w-4.5 h-4.5 text-white" />
                    </button>
                    <button
                      onClick={toggleMic}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: micOn ? "rgba(255,255,255,0.15)" : "rgba(239,68,68,0.4)", backdropFilter: "blur(8px)" }}
                    >
                      {micOn ? <Mic className="w-4.5 h-4.5 text-white" /> : <MicOff className="w-4.5 h-4.5 text-white" />}
                    </button>
                  </div>

                  {/* Live Analytics Panel */}
                  <AnimatePresence>
                    {showAnalytics && (
                      <div className="absolute bottom-32 left-3 right-16 z-20">
                        <StreamAnalyticsPanel
                          analytics={streamAnalytics.analytics}
                          isLive={isRecording}
                          onClose={() => setShowAnalytics(false)}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Guest Co-Stream Panel */}
                  <GuestCoStreamPanel streamId={streamData.streamId} isHost={true} />

                  {/* Live Polls & Q&A */}
                  <LivePollOverlay
                    streamId={streamData.streamId}
                    isHost={true}
                    userId={user?.id}
                    username={liveChatProfile?.display_name}
                  />

                  {/* Stream Alerts (animated tips/subs/milestones) */}
                  <StreamAlerts />

                  {/* Live Captions Overlay */}
                  <LiveCaptionsOverlay
                    captions={captions.captions}
                    interimText={captions.interimText}
                    isActive={captions.isActive}
                  />

                    {/* Raid Overlay */}
                  <RaidOverlay
                    isRaiding={raidSystem.isRaiding}
                    raidCountdown={raidSystem.raidCountdown}
                    incomingRaid={raidSystem.incomingRaid}
                  />

                  {/* Stream Predictions Overlay */}
                  <StreamPredictionOverlay
                    predictions={predictions.predictions}
                    isCreator={true}
                    onPlaceBet={predictions.placeBet}
                    onResolve={predictions.resolvePrediction}
                    userBets={predictions.userBets}
                  />

                  {/* Prediction Creator Modal */}
                  <AnimatePresence>
                    {showPredictionCreator && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-32 left-3 right-16 z-[15]"
                      >
                        <div className="rounded-xl p-3 space-y-2 bg-background/95 backdrop-blur-md border border-border">
                          <p className="text-xs font-bold text-foreground">🎰 Create Prediction</p>
                          <input
                            className="w-full text-xs bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
                            placeholder="Will I beat this boss?"
                            value={predQuestion}
                            onChange={e => setPredQuestion(e.target.value)}
                          />
                          {predOptions.map((opt, i) => (
                            <input
                              key={i}
                              className="w-full text-xs bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground"
                              placeholder={`Option ${i + 1}`}
                              value={opt}
                              onChange={e => {
                                const updated = [...predOptions];
                                updated[i] = e.target.value;
                                setPredOptions(updated);
                              }}
                            />
                          ))}
                          <div className="flex gap-2">
                            {predOptions.length < 4 && (
                              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setPredOptions(prev => [...prev, ""])}>
                                + Option
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-[10px] ml-auto"
                              disabled={!predQuestion || predOptions.filter(Boolean).length < 2}
                              onClick={() => {
                                predictions.createPrediction(predQuestion, predOptions.filter(Boolean));
                                setPredQuestion("");
                                setPredOptions(["", ""]);
                                setShowPredictionCreator(false);
                              }}
                            >
                              Start Prediction
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Live Auction Overlay */}
                  <LiveAuctionOverlay
                    auction={liveAuction.auction}
                    isHost={true}
                    onBid={liveAuction.placeBid}
                    onEnd={liveAuction.endAuction}
                    onCancel={liveAuction.cancelAuction}
                    bidHistory={liveAuction.bidHistory}
                  />

                  {/* Whiteboard Overlay */}
                  <WhiteboardOverlay whiteboard={whiteboard} />

                  {/* Overlay Theme Picker */}
                  <AnimatePresence>
                    {showThemePicker && (
                      <div className="absolute bottom-32 left-3 right-16 z-[15]">
                        <OverlayThemePicker
                          themes={overlayThemes.themes}
                          activeTheme={overlayThemes.activeTheme}
                          onSelect={overlayThemes.selectTheme}
                          onClose={() => setShowThemePicker(false)}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Viewer Heatmap (post-stream) */}
                  <AnimatePresence>
                    {showHeatmap && viewerHeatmap.data && (
                      <div className="absolute bottom-32 left-3 right-16 z-[15]">
                        <ViewerHeatmapPanel
                          data={viewerHeatmap.data}
                          durationSeconds={recordingDuration}
                          onClose={() => setShowHeatmap(false)}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Viewer Sentiment Overlay */}
                  <div className="absolute top-20 left-3 z-20 w-48">
                    <ViewerSentimentOverlay sentiment={sentiment} />
                  </div>

                  {/* Live Quiz */}
                  <AnimatePresence>
                    {showQuizCreator && (
                      <div className="absolute bottom-32 left-3 right-16 z-[15]">
                        <div className="glass-card p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-foreground">🧠 Create Quiz</span>
                            <button onClick={() => setShowQuizCreator(false)} className="text-muted-foreground hover:text-foreground">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <QuizCreatorPanel onStartQuiz={(qs) => { liveQuiz.startQuiz(qs); setShowQuizCreator(false); }} />
                        </div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Live Quiz Overlay (creator view) */}
                  <div className="absolute bottom-32 right-3 z-20 w-64">
                    <LiveQuizOverlay quiz={liveQuiz.quiz} isCreator={true} onSubmitAnswer={() => {}} />
                  </div>

                  <DonationGoalOverlay
                    streamId={streamData.streamId}
                    isHost={true}
                    creatorId={user?.id}
                  />

                  {/* Raid Picker */}
                  <AnimatePresence>
                    {showRaidPicker && !raidSystem.isRaiding && (
                      <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="absolute top-20 right-14 z-[15] w-56"
                      >
                        <div
                          className="rounded-xl p-3 space-y-2"
                          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}
                        >
                          <p className="text-xs font-bold text-white">🚀 Raid a Creator</p>
                          {raidSystem.availableTargets.length === 0 ? (
                            <p className="text-[10px] text-white/50">No other streams live right now</p>
                          ) : (
                            raidSystem.availableTargets.slice(0, 5).map(target => (
                              <button
                                key={target.streamId}
                                onClick={() => { raidSystem.initiateRaid(target); setShowRaidPicker(false); }}
                                className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors"
                              >
                                <p className="text-xs font-semibold text-white truncate">{target.displayName}</p>
                                <p className="text-[10px] text-white/50 truncate">{target.title} · {target.viewerCount} viewers</p>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* End Stream Confirmation Overlay */}
                  <AnimatePresence>
                    {showEndConfirm && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center"
                        onClick={() => setShowEndConfirm(false)}
                      >
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          className="bg-card rounded-2xl p-6 max-w-xs mx-4 text-center space-y-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                            <Square className="w-7 h-7 text-destructive" />
                          </div>
                          <h3 className="text-lg font-bold text-foreground">End Stream?</h3>
                          <p className="text-sm text-muted-foreground">Your recording will be saved and you'll see your stream stats.</p>
                          <div className="flex gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={() => setShowEndConfirm(false)}
                            >
                              Keep Going
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={handleEndStream}
                            >
                              End Stream
                            </Button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {mediaError && (
                    <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center">
                      <div className="bg-card rounded-xl p-4 max-w-xs text-center mx-4">
                        <p className="text-sm text-destructive font-medium">{mediaError}</p>
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setMediaError(null)}>Dismiss</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom bar: chat input + End Stream button */}
            {!isUploading && (
              <div className="relative z-20 px-3 py-3 flex items-center gap-2" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(16px)" }}>
                <input
                  value={liveChatInput}
                  onChange={(e) => setLiveChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLiveChatSend()}
                  placeholder="Say something..."
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button
                  onClick={handleLiveChatSend}
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: "#00FF85" }}
                >
                  <Send className="w-4 h-4 text-black" />
                </button>
                {/* Prominent End Stream button */}
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 transition-colors text-white text-sm font-semibold"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  End
                </button>
              </div>
            )}
          </div>

          {/* Share Panel — works while live */}
          <SharePanel
            open={showSharePanel}
            onClose={() => setShowSharePanel(false)}
            contentType="stream"
            contentId={streamData.streamId}
            title={title}
            playbackId={streamData.playbackId}
            creatorUsername={creatorUsername}
          />
        </>
      );
    }

    // Pre-recording setup view
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { stopCurrentStream(); setStudioMode("select"); setCameraOn(false); setMicOn(false); }} className="text-muted-foreground hover:text-foreground transition-colors">
              ← 
            </button>
            <div>
              <h3 className="text-sm font-bold text-foreground">Browser Recording</h3>
              <p className="text-[10px] text-muted-foreground">Record and save to your content library</p>
            </div>
          </div>
        </div>

        {/* Preview Window */}
        <div
          ref={videoContainerRef}
          className="relative overflow-hidden bg-black rounded-2xl border border-border w-full"
          style={{ aspectRatio: 'auto', minHeight: '200px', maxHeight: '70vh' }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${!cameraOn && !screenShare ? "hidden" : ""}`}
          />

          {!cameraOn && !screenShare && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <Video className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Start your camera or share screen</p>
                <p className="text-xs text-muted-foreground mt-1">Choose a source to begin recording</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => startCamera()}>
                  <Camera className="w-4 h-4 mr-1.5" /> Camera
                </Button>
                <Button variant="outline" size="sm" onClick={startScreenShare}>
                  <Monitor className="w-4 h-4 mr-1.5" /> Screen
                </Button>
              </div>
            </div>
          )}

          {(cameraOn || screenShare) && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm">
              <Volume2 className="w-3.5 h-3.5 text-white/80" />
              <div className="flex gap-0.5 items-end h-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(4, (i + 1) * 2)}px`,
                      backgroundColor: audioLevel > i / 8
                        ? i < 5 ? "#22c55e" : i < 7 ? "#eab308" : "#ef4444"
                        : "rgba(255,255,255,0.2)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <p className="text-sm font-semibold text-white truncate">{title}</p>
          </div>

          {mediaError && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-card rounded-xl p-4 max-w-xs text-center mx-4">
                <p className="text-sm text-destructive font-medium">{mediaError}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setMediaError(null)}>Dismiss</Button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button variant={cameraOn ? "default" : "outline"} size="icon" onClick={toggleCamera} className="rounded-full w-11 h-11">
            {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>
          <Button variant={micOn ? "default" : "outline"} size="icon" onClick={toggleMic} disabled={!cameraOn && !screenShare} className="rounded-full w-11 h-11">
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
          <Button
            variant={screenShare ? "default" : "outline"}
            size="icon"
            onClick={screenShare ? () => { stopCurrentStream(); setScreenShare(false); } : startScreenShare}
            className="rounded-full w-11 h-11"
          >
            <Monitor className="w-4 h-4" />
          </Button>
          {cameraOn && (
            <Button variant="outline" size="icon" onClick={flipCamera} className="rounded-full w-11 h-11">
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Featured Product Picker */}
        {products.length > 0 && (
          <FeaturedProductPicker
            products={products}
            featuredProductId={featuredProductId}
            onSelect={onFeaturedProductChange}
          />
        )}

        {/* Start Recording */}
        {(cameraOn || screenShare) && (
          <Button variant="hero" size="lg" onClick={startRecording} className="w-full">
            <Circle className="w-4 h-4 mr-2 fill-current" /> Start Recording
          </Button>
        )}

        {uploadFailed && !isUploading && (
          <div className="glass-card p-4 space-y-3 border border-destructive/30">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Upload failed</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{uploadErrorMsg}</p>
              </div>
            </div>
          </div>
        )}

        {!isRecording && !isUploading && !uploadFailed && (
          <Button variant="ghost" size="sm" onClick={() => { stopCurrentStream(); setCameraOn(false); setMicOn(false); setStudioMode("select"); }} className="w-full text-muted-foreground">
            ← Choose Different Method
          </Button>
        )}
      </div>
    );
  }

  // External encoder mode (OBS / RTMP)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setStudioMode("select")} className="text-muted-foreground hover:text-foreground transition-colors">
          ← 
        </button>
        <div>
          <h3 className="text-sm font-bold text-foreground">Live Stream via Encoder</h3>
          <p className="text-[10px] text-muted-foreground">Use OBS, Streamyard, or any RTMP app</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          {isLive ? (
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-destructive animate-pulse" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-bold text-sm text-foreground">{title}</p>
            {isLive ? (
              <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                </span>
                You're LIVE
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Waiting for encoder connection…</p>
            )}
          </div>
        </div>

        {!isLive && (
          <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 mb-4">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Copy the credentials below into your streaming software (OBS, Streamyard, etc). 
                Your stream will go LIVE automatically once the encoder connects.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">RTMP URL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground truncate">
                {streamData.rtmpUrl}
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => copyToClipboard(streamData.rtmpUrl, "rtmp")}>
                {copiedField === "rtmp" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Stream Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground truncate">
                {showKey ? streamData.streamKey : "••••••••••••••••••••"}
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => copyToClipboard(streamData.streamKey, "key")}>
                {copiedField === "key" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!isLive && (
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-foreground mb-2">How to go live:</p>
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Open OBS Studio or Streamyard</li>
            <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Paste the RTMP URL and Stream Key above</li>
            <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Click "Start Streaming" — this page updates to LIVE automatically</li>
            <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Your stream is auto-recorded and saved to your library</li>
          </ol>
        </div>
      )}

      {/* Creator Soundboard */}
      {isLive && (
        <CreatorSoundboard
          sounds={soundboard.sounds}
          playing={soundboard.playing}
          onPlay={soundboard.playSound}
          volume={soundboard.volume}
          onVolumeChange={soundboard.setVolume}
        />
      )}

      {products.length > 0 && (
        <FeaturedProductPicker
          products={products}
          featuredProductId={featuredProductId}
          onSelect={onFeaturedProductChange}
        />
      )}

      <Button variant="destructive" size="lg" onClick={() => onEndStream()} className="w-full">
        {isLive ? "End Stream" : "Cancel & Start Over"}
      </Button>
    </div>
  );
}
