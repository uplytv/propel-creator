import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Copy, Eye, Square, Upload, Send,
  RotateCcw, Zap, Share2, X, ShoppingBag,
  Activity, ArrowUpCircle, Signal, SignalHigh, SignalLow, SignalMedium,
  BarChart3, MessageCircleQuestion, Sparkles, Subtitles, Swords,
  Gamepad2, PenTool, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useStreamEngagement } from "@/hooks/useStreamEngagement";
import SharePanel from "@/components/share/SharePanel";
import { getSiteUrl } from "@/lib/siteUrl";
import { clearChunks, appendChunk, getAllChunks } from "@/lib/recordingStore";
import { ICE_SERVERS, getRecorderOptions, getCameraConstraints } from "@/lib/webrtcConfig";
import { useAdaptiveBitrate } from "@/hooks/useAdaptiveBitrate";
import { useBroadcasterHealth } from "@/hooks/useBroadcasterHealth";
import { useStreamAutoRecovery } from "@/hooks/useStreamAutoRecovery";
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
import StreamAlerts from "./StreamAlerts";
import LiveCaptionsOverlay from "./LiveCaptionsOverlay";
import RaidOverlay from "./RaidOverlay";
import DonationGoalOverlay from "./DonationGoalOverlay";
import StreamPredictionOverlay from "./StreamPredictionOverlay";
import LiveAuctionOverlay from "./LiveAuctionOverlay";
import WhiteboardOverlay from "./WhiteboardOverlay";
import OverlayThemePicker from "./OverlayThemePicker";
import ViewerHeatmapPanel from "./ViewerHeatmapPanel";
import ViewerSentimentOverlay from "./ViewerSentimentOverlay";
import { LiveQuizOverlay, QuizCreatorPanel } from "./LiveQuizOverlay";
import CreatorShopPanel from "./CreatorShopPanel";
import LiveTicketSalesPanel from "./LiveTicketSalesPanel";
import TVFeatureProductButton from "./TVFeatureProductButton";

import ModeSelectionScreen from "./ModeSelectionScreen";
import PreRecordingSetup from "./PreRecordingSetup";
import ExternalEncoderView from "./ExternalEncoderView";
import type { Product } from "./FeaturedProductPicker";
import { Sentry } from "@/lib/sentry";

interface BroadcastStudioProps {
  streamData: {
    streamId: string;
    streamKey: string;
    playbackId: string;
    rtmpUrl: string;
    slug?: string;
  };
  streamStatus: string;
  title: string;
  onEndStream: (info?: { muxAssetId?: string; durationSeconds?: number }) => void;
  products?: Product[];
  featuredProductId?: string | null;
  onFeaturedProductChange?: (productId: string | null) => void;
  creatorUsername?: string | null;
  hasQueuedShopProducts?: boolean;
  orientation?: 'landscape' | 'portrait';
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
  hasQueuedShopProducts = false,
  orientation = 'landscape',
}: BroadcastStudioProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pendingWritesRef = useRef<Promise<void>[]>([]);
  const webrtcChannelRef = useRef<any>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const [studioMode, setStudioMode] = useState<StudioMode>("select");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
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
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [liveChatInput, setLiveChatInput] = useState("");
  const [liveChatProfile, setLiveChatProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showRaidPicker, setShowRaidPicker] = useState(false);
  const endStreamDebounceRef = useRef(false);
  const [showPredictionCreator, setShowPredictionCreator] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [showShopPanel, setShowShopPanel] = useState(hasQueuedShopProducts);
  const [predQuestion, setPredQuestion] = useState("");
  const [predOptions, setPredOptions] = useState(["", ""]);
  const [linkedEventId, setLinkedEventId] = useState<string | null>(null);
  const [linkedEventData, setLinkedEventData] = useState<any>(null);
  const [eventSkipped, setEventSkipped] = useState(false);
  const [showTicketSales, setShowTicketSales] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);

  // Hooks
  const streamAnalytics = useStreamAnalytics(streamData.streamId, isRecording);
  const virtualBg = useVirtualBackground(streamRef, videoRef);
  const highlights = useStreamHighlights();
  const captions = useLiveCaptions();
  const raidSystem = useRaidSystem(streamData.streamId, true);
  const vodChapters = useVODChapters();
  const predictions = useStreamPredictions(streamData.streamId);
  const soundboard = useCreatorSoundboard();
  const liveAuction = useLiveAuction(streamData.streamId, true);
  const whiteboard = useCollaborativeWhiteboard();
  const overlayThemes = useStreamOverlayThemes();
  const viewerHeatmap = useViewerHeatmap(streamData.streamId);
  const liveQuiz = useLiveQuiz(streamData.streamId, true);
  const sentiment = useViewerSentiment(streamData.streamId);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      tryNative.catch(() => setIsFullscreen(true));
    }
  }, [isFullscreen]);

  // Sync fullscreen state + Escape key
  useEffect(() => {
    const handler = () => setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
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

  // Stream engagement
  const engagement = useStreamEngagement(streamData.streamId, user?.id || "", streamAnalytics.incrementChat);
  const [coachingNudge, setCoachingNudge] = useState<string | null>(null);
  const prevEnergyRef = useRef(0);

  const adaptiveBitrate = useAdaptiveBitrate(peerConnectionsRef, streamRef, isRecording);
  const broadcasterHealth = useBroadcasterHealth(peerConnectionsRef, isRecording);
  const autoRecovery = useStreamAutoRecovery(streamRef, videoRef, () => {
    peerConnectionsRef.current.forEach((pc) => {
      if (!streamRef.current) return;
      streamRef.current.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
        if (sender) sender.replaceTrack(track);
      });
    });
  });

  useEffect(() => {
    if (isRecording) {
      const cleanup = engagement.startEnergyBroadcast();
      autoRecovery.startMonitoring(facingMode);
      return () => { cleanup(); autoRecovery.stopMonitoring(); };
    }
  }, [isRecording, engagement.startEnergyBroadcast, autoRecovery.startMonitoring, autoRecovery.stopMonitoring, facingMode]);

  // Survive orientation change without killing the stream
  useEffect(() => {
    if (!isRecording) return;

    const handleRotation = () => {
      setTimeout(async () => {
        if (!streamRef.current || !videoRef.current) return;
        const videoTrack = streamRef.current.getVideoTracks()[0];
        // Only recover if the track actually died — don't interrupt a healthy stream
        if (!videoTrack || videoTrack.readyState === 'live') return;
        try {
          const constraints = getCameraConstraints(facingMode, orientation);
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          const newTrack = newStream.getVideoTracks()[0];
          streamRef.current.removeTrack(videoTrack);
          streamRef.current.addTrack(newTrack);
          videoRef.current!.srcObject = streamRef.current;
          // Hot-swap track in every active peer connection — stream continues uninterrupted
          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(newTrack).catch(() => {});
          });
        } catch {
          // Camera couldn't restart — stream audio continues, video will recover on next flip
        }
      }, 400);
    };

    window.addEventListener('orientationchange', handleRotation);
    try { screen.orientation?.addEventListener('change', handleRotation); } catch {}
    return () => {
      window.removeEventListener('orientationchange', handleRotation);
      try { screen.orientation?.removeEventListener('change', handleRotation); } catch {}
    };
  }, [isRecording, facingMode]);

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

  // ─── Media helpers ───
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current?.state !== "closed") { audioContextRef.current?.close(); audioContextRef.current = null; }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

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

  const startCamera = useCallback(async (facing: "user" | "environment" = facingMode) => {
    stopCurrentStream();
    setMediaError(null);
    try {
      const constraints = getCameraConstraints(facing, orientation);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true); setMicOn(true); setScreenShare(false);
      setupAudioAnalyser(stream);
    } catch {
      setMediaError("Camera access denied. Please allow camera & mic permissions.");
      setCameraOn(false); setMicOn(false);
    }
  }, [facingMode, stopCurrentStream]);

  const startScreenShare = useCallback(async () => {
    setMediaError(null);
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      });

      // Preserve camera audio track on screen share
      if (streamRef.current) {
        const cameraAudioTrack = streamRef.current.getAudioTracks()[0];
        if (cameraAudioTrack) screenStream.addTrack(cameraAudioTrack);
      }

      const newVideoTrack = screenStream.getVideoTracks()[0];

      if (streamRef.current && (isRecording || peerConnectionsRef.current.size > 0)) {
        // Hot-swap video track in active peer connections
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(newVideoTrack).catch(() => {});
        });
        const oldVideoTrack = streamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) { streamRef.current.removeTrack(oldVideoTrack); oldVideoTrack.stop(); }
        streamRef.current.addTrack(newVideoTrack);
      } else {
        stopCurrentStream();
        streamRef.current = screenStream;
      }

      if (videoRef.current) videoRef.current.srcObject = streamRef.current || screenStream;
      setScreenShare(true);
      setupAudioAnalyser(streamRef.current || screenStream);

      newVideoTrack.onended = async () => {
        setScreenShare(false);
        if (cameraOn) await startCamera(facingMode);
      };
    } catch {
      setMediaError('Screen share cancelled or not supported.');
      setScreenShare(false);
    }
  }, [stopCurrentStream, isRecording, cameraOn, facingMode, startCamera]);

  const toggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleCamera = () => {
    if (cameraOn) { stopCurrentStream(); setCameraOn(false); setMicOn(false); }
    else startCamera();
  };

  const flipCamera = useCallback(async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    if (!cameraOn || !streamRef.current) return;
    if (isRecording || peerConnectionsRef.current.size > 0) {
      try {
        const newVideoStream = await navigator.mediaDevices.getUserMedia({ ...getCameraConstraints(next, orientation), audio: false });
        const newVideoTrack = newVideoStream.getVideoTracks()[0];
        const oldVideoTrack = streamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) { streamRef.current.removeTrack(oldVideoTrack); oldVideoTrack.stop(); }
        streamRef.current.addTrack(newVideoTrack);
        if (videoRef.current) videoRef.current.srcObject = streamRef.current;
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(newVideoTrack);
        });
      } catch {
        setMediaError("Could not switch camera.");
      }
    } else {
      startCamera(next);
    }
  }, [facingMode, cameraOn, isRecording, startCamera]);

  // ─── Stream DB status ───
  const setStreamActive = async (active: boolean) => {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('mux_live_streams')
        .update({ status: active ? 'active' : 'idle', stream_type: 'browser', updated_at: now, ...(active ? { started_at: now } : { ended_at: now }) })
        .eq('id', streamData.streamId);
    } catch (err) {
      Sentry.captureException(err, { tags: { context: "broadcast_studio" } });
    }
  };

  // ─── WebRTC ───
  const startWebRTCHost = useCallback(() => {
    const channel = supabase.channel(`webrtc-${streamData.streamId}`, { config: { broadcast: { self: false } } });
    webrtcChannelRef.current = channel;
    channel
      .on('broadcast', { event: 'viewer-join' }, async (payload: any) => {
        const { viewerId, offer } = payload.payload;
        if (!streamRef.current || !offer) return;
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current.set(viewerId, pc);
        streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current!));
        enableSimulcast(pc);
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({ type: 'broadcast', event: 'ice-candidate', payload: { viewerId, from: 'host', candidate: event.candidate.toJSON() } });
          }
        };
        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            pc.close(); peerConnectionsRef.current.delete(viewerId);
          }
        };
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({ type: 'broadcast', event: 'host-answer', payload: { viewerId, answer: pc.localDescription?.toJSON() } });
        } catch {
          pc.close(); peerConnectionsRef.current.delete(viewerId);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload: any) => {
        const { viewerId, from, candidate } = payload.payload;
        if (from !== 'viewer') return;
        const pc = peerConnectionsRef.current.get(viewerId);
        if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
        }
      })
      .subscribe();
  }, [streamData.streamId]);

  const stopWebRTCHost = useCallback(() => {
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    if (webrtcChannelRef.current) { supabase.removeChannel(webrtcChannelRef.current); webrtcChannelRef.current = null; }
  }, []);

  // ─── Recording ───
  const startRecording = async () => {
    if (!streamRef.current) return;
    await clearChunks();
    chunksRef.current = [];
    pendingWritesRef.current = [];
    const { mimeType, videoBitsPerSecond } = getRecorderOptions(orientation);
    const recorder = new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        const p: Promise<void> = appendChunk(e.data).then(() => undefined).catch((err) => { Sentry.captureException(err, { tags: { context: "broadcast_studio" } }); });
        pendingWritesRef.current.push(p);
      }
    };
    recorder.onstop = () => {};
    recorder.start(5000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingDuration(0);
    highlights.start();
    vodChapters.start();
    recordingTimerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    await setStreamActive(true);
    startWebRTCHost();
  };

  // ─── End stream handler ───
  const handleEndStream = useCallback(async () => {
    if (endStreamDebounceRef.current) return;
    endStreamDebounceRef.current = true;
    setTimeout(() => { endStreamDebounceRef.current = false; }, 500);
    const duration = recordingDuration;
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setIsRecording(false);
    setShowEndConfirm(false);
    stopWebRTCHost();
    await setStreamActive(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      await new Promise<void>((resolve) => { mediaRecorderRef.current!.onstop = () => resolve(); mediaRecorderRef.current!.stop(); });
    }
    // Wait for ALL pending IndexedDB writes to finish before reading chunks
    if (pendingWritesRef.current.length > 0) {
      await Promise.allSettled(pendingWritesRef.current);
      pendingWritesRef.current = [];
    }
    stopCurrentStream();
    const persistedChunks = await getAllChunks();
    if (persistedChunks.length === 0) { onEndStream({ durationSeconds: duration }); return; }
    if (!user) { onEndStream({ durationSeconds: duration }); return; }
    setIsUploading(true); setUploadProgress(0); setUploadFailed(false);

    // ─── Acquire Wake Lock so mobile browsers don't kill the upload when the
    // screen sleeps or the user switches tabs. Without this, MediaRecorder /
    // chunked uploads on iOS Safari are paused, causing 5%-stuck uploads.
    let wakeLock: any = null;
    try {
      // @ts-ignore — Wake Lock API
      if (navigator.wakeLock?.request) {
        // @ts-ignore
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (e) {
      console.warn("[BroadcastStudio] Wake Lock unavailable:", e);
    }
    const reacquireWakeLock = async () => {
      if (document.visibilityState === "visible" && !wakeLock) {
        try {
          // @ts-ignore
          if (navigator.wakeLock?.request) {
            // @ts-ignore
            wakeLock = await navigator.wakeLock.request("screen");
          }
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", reacquireWakeLock);

    try {
      const blob = new Blob(persistedChunks, { type: "video/webm" });

      // Auto-download: subscribe BEFORE starting the upload so we never miss
      // the asset.ready event. Listen on mux_assets (not stream_recordings)
      // because browser uploads land there first.
      let dlChannel: any = null;
      let downloadFired = false;
      const fireDownload = async (assetId: string, recTitle: string) => {
        if (downloadFired) return;
        downloadFired = true;
        try {
          const { data: dlData, error: dlErr } = await supabase.functions.invoke('download-asset', {
            body: { asset_id: assetId },
          });
          if (dlErr) throw dlErr;
          if (dlData?.url) {
            const a = document.createElement('a');
            a.href = dlData.url;
            a.download = (recTitle || title || 'recording') + '.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success('Recording downloaded ✓');
          }
        } catch {
          toast.error('Auto-download failed — download from Content Library');
        }
        if (dlChannel) supabase.removeChannel(dlChannel);
      };

      const { uploadToMuxWithRetry } = await import("@/lib/muxUpload");

      // Wrap onProgress so we can capture the uploadId BEFORE upload completes
      // (we need it to subscribe to the correct row). uploadToMuxWithRetry
      // returns the uploadId only after success — but mux-create-upload already
      // inserted the mux_assets row, so we listen by user_id and match later.
      if (autoDownload) {
        toast.info("Recording will auto-download when ready…", { duration: 6000 });
        dlChannel = supabase
          .channel('auto-dl-' + user.id + '-' + Date.now())
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'mux_assets',
            filter: `user_id=eq.${user.id}`,
          }, async (payload: any) => {
            const row = payload.new || payload.record;
            if (row?.status === 'ready' && row?.mux_asset_id && row?.mux_asset_id !== 'pending') {
              await fireDownload(row.mux_asset_id, row.title);
            }
          })
          .subscribe();
      }

      const uploadId = await uploadToMuxWithRetry({
        userId: user.id, title: `${title} (Recording)`, description: "Browser recording",
        isPublic: true, file: blob, onProgress: (pct) => setUploadProgress(pct),
      });
      toast.success("Recording saved! 🎬", { description: "Your video is processing." });
      await clearChunks();
      chunksRef.current = [];
      setIsUploading(false);

      // Safety net: if realtime didn't fire within 90s, poll once.
      if (autoDownload) {
        setTimeout(async () => {
          if (downloadFired) return;
          try {
            const { data } = await supabase
              .from('mux_assets')
              .select('mux_asset_id, status, title')
              .eq('upload_id', uploadId)
              .maybeSingle();
            if (data?.status === 'ready' && data.mux_asset_id && data.mux_asset_id !== 'pending') {
              await fireDownload(data.mux_asset_id, data.title || title);
            }
          } catch {}
        }, 90000);
      }

      onEndStream({ muxAssetId: uploadId || undefined, durationSeconds: duration });
    } catch (err: any) {
      setUploadFailed(true);
      setUploadErrorMsg(err.message || "Upload failed");
      toast.error("Upload failed", {
        description: (err.message || "") + " — your recording is saved locally and will auto-resume next time you open the app.",
      });
      setIsUploading(false);
      onEndStream({ durationSeconds: duration });
    } finally {
      document.removeEventListener("visibilitychange", reacquireWakeLock);
      try { wakeLock?.release?.(); } catch {}
    }
  }, [recordingDuration, stopWebRTCHost, stopCurrentStream, user, title, onEndStream, toast, autoDownload]);


  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Safe clipboard helper
  const safeClipboardWrite = async (text: string) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy");
        document.body.removeChild(ta); return true;
      } catch { return false; }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    const sid = streamData.streamId;
    return () => {
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      if (webrtcChannelRef.current) { supabase.removeChannel(webrtcChannelRef.current); webrtcChannelRef.current = null; }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current?.state !== "closed") audioContextRef.current?.close();
      supabase.from('mux_live_streams').update({ status: 'idle', ended_at: new Date().toISOString() }).eq('id', sid).then(() => {});
    };
     
  }, [streamData.streamId]);

  const isLive = streamStatus === "active";
  const liveShareUrl = creatorUsername && streamData.slug
    ? `${getSiteUrl()}/${encodeURIComponent(creatorUsername)}/live/${streamData.slug}`
    : `${getSiteUrl()}/stream/${streamData.streamId}`;

  // Re-attach stream to video element after state-driven re-renders
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  // 1) Mode selection
  if (studioMode === "select") {
    return (
      <ModeSelectionScreen
        onSelectBrowserRecord={() => { setStudioMode("browser-record"); startCamera(); }}
        onSelectExternalEncoder={() => setStudioMode("external-encoder")}
        onGoBack={() => onEndStream()}
      />
    );
  }

  // 2) Browser recording — immersive live view
  if (studioMode === "browser-record") {
    if (isRecording || isUploading) {
      return (
        <>
          <div className="fixed inset-0 z-[80] bg-black flex flex-col">
            <div ref={videoContainerRef} className="relative flex-1 overflow-hidden">
              {isUploading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-30">
                  <Upload className="w-10 h-10 text-primary animate-bounce" />
                  <p className="text-lg font-bold text-white">Saving your stream…</p>
                  <div className="w-48 h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${uploadProgress}%` }} />
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
                    className={cn(
                      "w-full h-full",
                      orientation === 'portrait' ? "object-contain bg-black" : "object-cover"
                    )}
                  />
                  {/* Orientation indicator (non-removable while live) */}
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-0.5">
                    <div className={cn(
                      "border border-white/60 rounded-sm",
                      orientation === 'landscape' ? "w-4 h-2.5" : "w-2.5 h-4"
                    )} />
                    <span className="text-white text-[10px] font-medium opacity-80">
                      {orientation === 'landscape' ? '16:9' : '9:16'}
                    </span>
                  </div>

                  {/* Top bar — LIVE indicator */}
                  <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
                    <div className="pointer-events-auto mx-3 mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl" style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(16px)" }}>
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
                          <Zap className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                            <motion.div className="h-full rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} animate={{ width: `${engagement.energyScore}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Broadcaster Health */}
                  <div className="absolute top-16 right-3 z-20 pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}>
                      <div className="flex items-center gap-1">
                        <ArrowUpCircle className="w-3 h-3 text-white/60" />
                        <span className="text-[10px] font-mono text-white/80">{broadcasterHealth.uploadSpeedMbps.toFixed(1)} Mbps</span>
                      </div>
                      <div className="w-px h-3 bg-white/20" />
                      <div className="flex items-center gap-1">
                        {broadcasterHealth.quality === 'excellent' ? <Signal className="w-3 h-3 text-green-400" /> :
                         broadcasterHealth.quality === 'good' ? <SignalHigh className="w-3 h-3 text-green-400" /> :
                         broadcasterHealth.quality === 'fair' ? <SignalMedium className="w-3 h-3 text-yellow-400" /> :
                         <SignalLow className="w-3 h-3 text-red-400" />}
                        <span className={`text-[10px] font-mono font-semibold ${
                          broadcasterHealth.quality === 'excellent' || broadcasterHealth.quality === 'good' ? 'text-green-400' :
                          broadcasterHealth.quality === 'fair' ? 'text-yellow-400' : 'text-red-400'
                        }`}>{broadcasterHealth.quality.toUpperCase()}</span>
                      </div>
                      {broadcasterHealth.dropRate > 0.03 && (<><div className="w-px h-3 bg-white/20" /><span className="text-[10px] font-mono text-red-400">{broadcasterHealth.droppedFrames} drops</span></>)}
                      {adaptiveBitrate.currentLevel !== 'high' && (<><div className="w-px h-3 bg-white/20" /><span className="text-[10px] font-mono text-yellow-400">{adaptiveBitrate.currentLevel === 'medium' ? '480p' : '360p'}</span></>)}
                    </div>
                    {autoRecovery.isRecovering && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: "rgba(234,179,8,0.2)", backdropFilter: "blur(8px)" }}>
                        <Activity className="w-3 h-3 text-yellow-400 animate-pulse" />
                        <span className="text-[10px] font-semibold text-yellow-400">Reconnecting stream...</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Coaching nudge */}
                  <AnimatePresence>
                    {coachingNudge && (
                      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                        className="absolute top-16 inset-x-0 z-20 pointer-events-none mx-auto w-fit rounded-xl px-4 py-2 text-xs font-bold text-center"
                        style={{ backgroundColor: "rgba(61, 124, 255,0.15)", color: "hsl(var(--primary))", backdropFilter: "blur(12px)" }}>
                        {coachingNudge}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Floating chat */}
                  <div className="absolute bottom-28 left-0 right-16 z-10 pointer-events-none px-3">
                    <div className="flex flex-col gap-1 max-h-[35vh] overflow-hidden">
                      <AnimatePresence initial={false}>
                        {engagement.chatMessages.slice(-8).map((msg) => {
                          const isCreator = msg.user_id === user?.id;
                          return (
                            <motion.div key={msg.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                              className="text-[13px] leading-tight" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                              <span className="font-bold" style={{ color: isCreator ? "hsl(var(--warning))" : "hsl(var(--primary))" }}>
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
                  <div
                    className="absolute right-3 top-24 bottom-28 z-20 flex flex-col gap-3 items-center overflow-y-auto overscroll-contain pb-1 pr-1"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <ActionButton onClick={() => setShowShopPanel(!showShopPanel)} active={showShopPanel} activeBg="rgba(61, 124, 255,0.3)" icon={<ShoppingBag className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={() => setShowSharePanel(true)} bg="rgba(61, 124, 255,0.25)" icon={<Share2 className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={async () => {
                      const ok = await safeClipboardWrite(liveShareUrl);
                      ok ? toast.success("Live link copied ✓", { description: liveShareUrl }) : toast.error("Could not copy link");
                    }} icon={<Copy className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={() => setShowAnalytics(!showAnalytics)} active={showAnalytics} icon={<BarChart3 className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={() => setShowPollCreator(true)} icon={<MessageCircleQuestion className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={() => captions.toggle()} active={captions.isActive} icon={<Subtitles className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={() => { raidSystem.fetchTargets(); setShowRaidPicker(!showRaidPicker); }} active={showRaidPicker} activeBg="rgba(239,68,68,0.3)" icon={<Swords className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={() => setShowPredictionCreator(!showPredictionCreator)} active={showPredictionCreator} activeBg="rgba(245,158,11,0.3)" icon={<Gamepad2 className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={() => whiteboard.toggle()} active={whiteboard.state.isActive} activeBg="rgba(59,130,246,0.3)" icon={<PenTool className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={() => setShowThemePicker(!showThemePicker)} active={showThemePicker} activeBg="rgba(168,85,247,0.3)" icon={<Palette className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={() => virtualBg.toggleEffect(virtualBg.effect === 'blur' ? 'none' : 'blur')} active={virtualBg.effect !== 'none'} activeBg="rgba(168,85,247,0.3)" icon={<Sparkles className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={flipCamera} icon={<RotateCcw className="w-4.5 h-4.5 text-white" />} />
                    <ActionButton onClick={toggleMic} bg={micOn ? undefined : "rgba(239,68,68,0.4)"} icon={micOn ? <Mic className="w-4.5 h-4.5 text-white" /> : <MicOff className="w-4.5 h-4.5 text-white" />} />
                  </div>

                  {/* Live Ticket Sales Panel — event streams only */}
                  <AnimatePresence>
                    {linkedEventId && showTicketSales && (
                      <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="absolute top-20 left-3 z-[15] w-56">
                        <LiveTicketSalesPanel streamId={streamData.streamId} eventId={linkedEventId} viewerCount={engagement.viewerCount} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Overlays */}
                  <AnimatePresence>
                    {showAnalytics && (
                      <div className="absolute bottom-32 left-3 right-16 z-20">
                        <StreamAnalyticsPanel analytics={streamAnalytics.analytics} isLive={isRecording} onClose={() => setShowAnalytics(false)} />
                      </div>
                    )}
                  </AnimatePresence>
                  <GuestCoStreamPanel streamId={streamData.streamId} isHost={true} />
                  <LivePollOverlay streamId={streamData.streamId} isHost={true} userId={user?.id} username={liveChatProfile?.display_name} />
                  <StreamAlerts />
                  <LiveCaptionsOverlay captions={captions.captions} interimText={captions.interimText} isActive={captions.isActive} />
                  <RaidOverlay isRaiding={raidSystem.isRaiding} raidCountdown={raidSystem.raidCountdown} incomingRaid={raidSystem.incomingRaid} />
                  <StreamPredictionOverlay predictions={predictions.predictions} isCreator={true} onPlaceBet={predictions.placeBet} onResolve={predictions.resolvePrediction} userBets={predictions.userBets} />

                  {/* Prediction Creator */}
                  <AnimatePresence>
                    {showPredictionCreator && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-32 left-3 right-16 z-[15]">
                        <div className="rounded-xl p-3 space-y-2 bg-background/95 backdrop-blur-md border border-border">
                          <p className="text-xs font-bold text-foreground">🎰 Create Prediction</p>
                          <input className="w-full text-xs bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground" placeholder="Will I beat this boss?" value={predQuestion} onChange={e => setPredQuestion(e.target.value)} />
                          {predOptions.map((opt, i) => (
                            <input key={i} className="w-full text-xs bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground" placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const updated = [...predOptions]; updated[i] = e.target.value; setPredOptions(updated); }} />
                          ))}
                          <div className="flex gap-2">
                            {predOptions.length < 4 && <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setPredOptions(prev => [...prev, ""])}>+ Option</Button>}
                            <Button size="sm" variant="default" className="h-7 text-[10px] ml-auto" disabled={!predQuestion || predOptions.filter(Boolean).length < 2}
                              onClick={() => { predictions.createPrediction(predQuestion, predOptions.filter(Boolean)); setPredQuestion(""); setPredOptions(["", ""]); setShowPredictionCreator(false); }}>
                              Start Prediction
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <LiveAuctionOverlay auction={liveAuction.auction} isHost={true} onBid={liveAuction.placeBid} onEnd={liveAuction.endAuction} onCancel={liveAuction.cancelAuction} bidHistory={liveAuction.bidHistory} />
                  <WhiteboardOverlay whiteboard={whiteboard} />

                  <AnimatePresence>
                    {showThemePicker && (
                      <div className="absolute bottom-32 left-3 right-16 z-[15]">
                        <OverlayThemePicker themes={overlayThemes.themes} activeTheme={overlayThemes.activeTheme} onSelect={overlayThemes.selectTheme} onClose={() => setShowThemePicker(false)} />
                      </div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showHeatmap && viewerHeatmap.data && (
                      <div className="absolute bottom-32 left-3 right-16 z-[15]">
                        <ViewerHeatmapPanel data={viewerHeatmap.data} durationSeconds={recordingDuration} onClose={() => setShowHeatmap(false)} />
                      </div>
                    )}
                  </AnimatePresence>

                  <div className="absolute top-20 left-3 z-20 w-48">
                    <ViewerSentimentOverlay sentiment={sentiment} />
                  </div>

                  <AnimatePresence>
                    {showQuizCreator && (
                      <div className="absolute bottom-32 left-3 right-16 z-[15]">
                        <div className="glass-card p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-foreground">🧠 Create Quiz</span>
                            <button onClick={() => setShowQuizCreator(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                          </div>
                          <QuizCreatorPanel onStartQuiz={(qs) => { liveQuiz.startQuiz(qs); setShowQuizCreator(false); }} />
                        </div>
                      </div>
                    )}
                  </AnimatePresence>

                  <div className="absolute bottom-32 right-3 z-20 w-64">
                    <LiveQuizOverlay quiz={liveQuiz.quiz} isCreator={true} onSubmitAnswer={() => {}} />
                  </div>

                  <DonationGoalOverlay streamId={streamData.streamId} isHost={true} creatorId={user?.id} />

                  {/* Shop Panel */}
                  <AnimatePresence>
                    {showShopPanel && (
                      <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
                        className="absolute bottom-32 left-3 right-16 z-[15]">
                        <div className="rounded-xl p-3 space-y-2 bg-background/95 backdrop-blur-md border border-border max-h-[50vh] overflow-y-auto">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">🛍️ Live Shop</span>
                            <button onClick={() => setShowShopPanel(false)} className="text-muted-foreground hover:text-foreground">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <CreatorShopPanel streamId={streamData.streamId} />
                          <div className="pt-2 border-t border-border/50">
                            <TVFeatureProductButton streamId={streamData.streamId} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Raid Picker */}
                  <AnimatePresence>
                    {showRaidPicker && !raidSystem.isRaiding && (
                      <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="absolute top-20 right-14 z-[15] w-56">
                        <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}>
                          <p className="text-xs font-bold text-white">🚀 Raid a Creator</p>
                          {raidSystem.availableTargets.length === 0 ? (
                            <p className="text-[10px] text-white/50">No other streams live right now</p>
                          ) : raidSystem.availableTargets.slice(0, 5).map(target => (
                            <button key={target.streamId} onClick={() => { raidSystem.initiateRaid(target); setShowRaidPicker(false); }} className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors">
                              <p className="text-xs font-semibold text-white truncate">{target.displayName}</p>
                              <p className="text-[10px] text-white/50 truncate">{target.title} · {target.viewerCount} viewers</p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* End Stream Confirmation */}
                  <AnimatePresence>
                    {showEndConfirm && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowEndConfirm(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card rounded-2xl p-6 max-w-xs mx-4 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
                          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto"><Square className="w-7 h-7 text-destructive" /></div>
                          <h3 className="text-lg font-bold text-foreground">End Stream?</h3>
                          <p className="text-sm text-muted-foreground">Your recording will be saved and you'll see your stream stats.</p>
                          <div className="flex gap-3">
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowEndConfirm(false)}>Keep Going</Button>
                            <Button variant="destructive" size="sm" className="flex-1" onClick={handleEndStream}>End Stream</Button>
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

            {/* Bottom bar */}
            {!isUploading && (
              <div className="relative z-[100] px-3 py-3 flex items-center gap-2" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(16px)" }}>
                <input value={liveChatInput} onChange={(e) => setLiveChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLiveChatSend()} placeholder="Say something..."
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }} />
                <button onClick={handleLiveChatSend} className="p-2.5 rounded-xl" style={{ backgroundColor: "hsl(var(--primary))" }}>
                  <Send className="w-4 h-4 text-black" />
                </button>
                <button onClick={() => setShowEndConfirm(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 transition-colors text-white text-sm font-semibold">
                  <Square className="w-3.5 h-3.5 fill-white" /> End
                </button>
              </div>
            )}
          </div>

          <div className="relative z-[9999]">
            <SharePanel open={showSharePanel} onClose={() => setShowSharePanel(false)} contentType="stream" contentId={streamData.streamId} title={title} playbackId={streamData.playbackId} creatorUsername={creatorUsername} contentSlug={streamData.slug || streamData.streamId} />
          </div>
        </>
      );
    }

    // Pre-recording setup
    return (
      <PreRecordingSetup
        title={title}
        videoRef={videoRef as any}
        videoContainerRef={videoContainerRef as any}
        cameraOn={cameraOn}
        micOn={micOn}
        screenShare={screenShare}
        audioLevel={audioLevel}
        mediaError={mediaError}
        uploadFailed={uploadFailed}
        uploadErrorMsg={uploadErrorMsg}
        isRecording={isRecording}
        isUploading={isUploading}
        products={products}
        featuredProductId={featuredProductId}
        onFeaturedProductChange={onFeaturedProductChange}
        streamId={streamData.streamId}
        linkedEventId={linkedEventId}
        onEventLinked={(eventId, eventData) => { setLinkedEventId(eventId); setLinkedEventData(eventData); setShowTicketSales(true); }}
        onEventSkipped={() => setEventSkipped(true)}
        onToggleCamera={toggleCamera}
        onToggleMic={toggleMic}
        onStartCamera={() => startCamera()}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={() => { stopCurrentStream(); setScreenShare(false); }}
        onFlipCamera={flipCamera}
        onStartRecording={startRecording}
        onDismissError={() => setMediaError(null)}
        onGoBack={() => { stopCurrentStream(); setStudioMode("select"); setCameraOn(false); setMicOn(false); }}
        autoDownload={autoDownload}
        onAutoDownloadChange={setAutoDownload}
      />
    );
  }

  // 3) External encoder mode
  return (
    <ExternalEncoderView
      streamData={streamData}
      isLive={isLive}
      title={title}
      products={products}
      featuredProductId={featuredProductId}
      onFeaturedProductChange={onFeaturedProductChange}
      onEndStream={() => onEndStream()}
      soundboard={soundboard}
      onGoBack={() => setStudioMode("select")}
    />
  );
}

// ─── Shared action button component ───
function ActionButton({ onClick, icon, active, bg, activeBg }: {
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
  bg?: string;
  activeBg?: string;
}) {
  const defaultBg = "rgba(255,255,255,0.15)";
  const resolvedBg = bg ?? (active ? (activeBg ?? "rgba(61, 124, 255,0.3)") : defaultBg);
  return (
    <button onClick={onClick} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: resolvedBg, backdropFilter: "blur(8px)" }}>
      {icon}
    </button>
  );
}
