import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, VideoOff, Mic, MicOff, Monitor, Camera,
  Settings, Copy, Check, Eye, EyeOff, Radio,
  RotateCcw, Maximize2, Minimize2, Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BroadcastStudioProps {
  streamData: {
    streamId: string;
    streamKey: string;
    playbackId: string;
    rtmpUrl: string;
  };
  streamStatus: string;
  title: string;
  onEndStream: () => void;
}

export default function BroadcastStudio({
  streamData,
  streamStatus,
  title,
  onEndStream,
}: BroadcastStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showCredentials, setShowCredentials] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Audio analysis
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
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
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      // Also grab mic audio
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getAudioTracks().forEach((t) => screenStream.addTrack(t));
      } catch { /* mic optional for screen share */ }

      streamRef.current = screenStream;
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
      }
      setCameraOn(false);
      setMicOn(true);
      setScreenShare(true);
      setupAudioAnalyser(screenStream);

      // Listen for screen share stop
      screenStream.getVideoTracks()[0].onended = () => {
        setScreenShare(false);
        stopCurrentStream();
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
    const audioTracks = streamRef.current.getAudioTracks();
    audioTracks.forEach((t) => (t.enabled = !t.enabled));
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

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    if (cameraOn) startCamera(next);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    return () => stopCurrentStream();
  }, [stopCurrentStream]);

  const isLive = streamStatus === "active";

  return (
    <div className="space-y-4">
      {/* Preview Window */}
      <div className="relative rounded-2xl overflow-hidden bg-secondary/80 border border-border aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!cameraOn && !screenShare ? "hidden" : ""}`}
        />

        {/* Blank state */}
        {!cameraOn && !screenShare && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Camera Preview</p>
              <p className="text-xs text-muted-foreground mt-1">
                Turn on your camera or share your screen to preview
              </p>
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

        {/* Live badge overlay */}
        <AnimatePresence>
          {isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/90 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive-foreground" />
              </span>
              <span className="text-xs font-bold text-destructive-foreground tracking-wider">LIVE</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          {!isLive && (
            <p className="text-xs text-white/70 mt-0.5">Waiting for RTMP stream…</p>
          )}
        </div>

        {/* Audio level indicator */}
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
                      ? i < 5 ? "hsl(var(--success))" : i < 7 ? "hsl(var(--warning))" : "hsl(var(--destructive))"
                      : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error overlay */}
        {mediaError && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-card rounded-xl p-4 max-w-xs text-center mx-4">
              <p className="text-sm text-destructive font-medium">{mediaError}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setMediaError(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant={cameraOn ? "default" : "outline"}
          size="icon"
          onClick={toggleCamera}
          className="rounded-full w-11 h-11"
        >
          {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </Button>
        <Button
          variant={micOn ? "default" : "outline"}
          size="icon"
          onClick={toggleMic}
          disabled={!cameraOn && !screenShare}
          className="rounded-full w-11 h-11"
        >
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
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCredentials(!showCredentials)}
          className="rounded-full"
        >
          <Settings className="w-4 h-4 mr-1.5" />
          Stream Keys
        </Button>
      </div>

      {/* Collapsible Credentials */}
      <AnimatePresence>
        {showCredentials && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Stream Credentials</h3>
                <div className="flex items-center gap-2">
                  {isLive ? (
                    <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                      </span>
                      Connected
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Waiting for encoder…</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste these into OBS, Streamyard, or any RTMP encoder. Your preview above will show what viewers see.
              </p>

              {/* RTMP URL */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                  RTMP URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground truncate">
                    {streamData.rtmpUrl}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={() => copyToClipboard(streamData.rtmpUrl, "rtmp")}
                  >
                    {copiedField === "rtmp" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Stream Key */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                  Stream Key
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground truncate">
                    {showKey ? streamData.streamKey : "••••••••••••••••••••"}
                  </div>
                  <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={() => copyToClipboard(streamData.streamKey, "key")}
                  >
                    {copiedField === "key" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Steps (only when not live) */}
      {!isLive && !showCredentials && (
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-foreground mb-2">Quick Start</p>
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Preview your camera above</li>
            <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Click "Stream Keys" and copy credentials into OBS/Streamyard</li>
            <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Start streaming — your status updates to LIVE automatically</li>
          </ol>
        </div>
      )}

      {/* End Stream */}
      <Button variant="destructive" size="lg" onClick={onEndStream} className="w-full">
        {isLive ? "End Stream" : "Cancel & Start Over"}
      </Button>
    </div>
  );
}
