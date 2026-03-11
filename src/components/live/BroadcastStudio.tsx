import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, VideoOff, Mic, MicOff, Monitor, Camera,
  Settings, Copy, Check, Eye, EyeOff, Radio,
  RotateCcw, Volume2, Circle, Square, Upload,
  Wifi, WifiOff, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

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

type StudioMode = "select" | "browser-record" | "external-encoder";

export default function BroadcastStudio({
  streamData,
  streamStatus,
  title,
  onEndStream,
}: BroadcastStudioProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [mediaError, setMediaError] = useState<string | null>(null);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      screenStream.getVideoTracks()[0].onended = () => {
        if (isRecording) stopRecording();
        setScreenShare(false);
        stopCurrentStream();
      };
    } catch {
      setMediaError("Screen share cancelled or not supported.");
      setScreenShare(false);
    }
  }, [stopCurrentStream, isRecording]);

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

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    if (cameraOn) startCamera(next);
  };

  // Set stream status in DB so discovery feed picks it up
  const setStreamActive = async (active: boolean) => {
    try {
      await supabase
        .from('mux_live_streams')
        .update({
          status: active ? 'active' : 'idle',
          started_at: active ? new Date().toISOString() : undefined,
          ended_at: active ? undefined : new Date().toISOString(),
        })
        .eq('mux_stream_id', streamData.streamId);
    } catch (err) {
      console.error('Failed to update stream status:', err);
    }
  };

  // Recording
  const startRecording = async () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      // Recording stopped, chunks are ready
    };
    recorder.start(1000); // collect in 1s chunks
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);

    // Mark stream as active in DB for discovery feed
    await setStreamActive(true);
  };

  const stopRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);

    // Wait for the recorder to fully stop and flush all chunks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      await new Promise<void>((resolve) => {
        mediaRecorderRef.current!.onstop = () => resolve();
        mediaRecorderRef.current!.stop();
      });
    }

    if (chunksRef.current.length === 0) {
      toast({ title: "No recording data", description: "Recording was too short.", variant: "destructive" });
      return;
    }

    // Upload the recording
    await uploadRecording();
  };

  const uploadRecording = async () => {
    if (!user) return;
    setIsUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });

      // Create a Mux direct upload via the edge function
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke("mux-create-upload", {
        body: { userId: user.id, title: `${title} (Recording)`, description: "Browser recording", isPublic: true },
      });

      if (uploadError) throw uploadError;

      // Upload the video to Mux's direct upload URL
      const uploadUrl = uploadData.uploadUrl;
      const uploadResp = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "video/webm" },
      });

      if (!uploadResp.ok) throw new Error("Upload to video service failed");

      toast({ title: "Recording saved! 🎬", description: "Your video is processing and will appear in your content library." });
      chunksRef.current = [];
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    return () => {
      stopCurrentStream();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [stopCurrentStream]);

  const isLive = streamStatus === "active";

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
                Stream live to your audience using OBS, Streamyard, or any RTMP encoder. Viewers see your stream in real-time.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Live to audience</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Auto-recorded</span>
              </div>
            </div>
          </div>
        </button>

        <Button variant="ghost" size="sm" onClick={onEndStream} className="w-full text-muted-foreground">
          ← Go Back
        </Button>
      </div>
    );
  }

  // Browser recording mode
  if (studioMode === "browser-record") {
    return (
      <div className="space-y-4">
        {/* Header */}
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
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
              <span className="text-xs font-mono font-bold text-destructive">{formatDuration(recordingDuration)}</span>
            </div>
          )}
        </div>

        {/* Preview Window */}
        <div className="relative rounded-2xl overflow-hidden bg-secondary/80 border border-border aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!cameraOn && !screenShare ? "hidden" : ""}`}
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

          {/* Audio level */}
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

          {/* Recording indicator overlay */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/90 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span className="text-xs font-bold text-white tracking-wider">REC</span>
            </div>
          )}

          {/* Title overlay */}
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
          <Button
            variant={cameraOn ? "default" : "outline"}
            size="icon"
            onClick={toggleCamera}
            className="rounded-full w-11 h-11"
            disabled={isRecording}
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
            disabled={isRecording}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          {cameraOn && !isRecording && (
            <Button variant="outline" size="icon" onClick={flipCamera} className="rounded-full w-11 h-11">
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Record / Stop / Upload */}
        {(cameraOn || screenShare) && !isUploading && (
          <Button
            variant={isRecording ? "destructive" : "hero"}
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            className="w-full"
          >
            {isRecording ? (
              <><Square className="w-4 h-4 mr-2" /> Stop Recording & Save</>
            ) : (
              <><Circle className="w-4 h-4 mr-2 fill-current" /> Start Recording</>
            )}
          </Button>
        )}

        {isUploading && (
          <div className="glass-card p-4 text-center">
            <Upload className="w-6 h-6 text-primary mx-auto animate-bounce mb-2" />
            <p className="text-sm font-medium text-foreground">Uploading your recording…</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a moment depending on the length</p>
          </div>
        )}

        {!isRecording && !isUploading && (
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
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => setStudioMode("select")} className="text-muted-foreground hover:text-foreground transition-colors">
          ← 
        </button>
        <div>
          <h3 className="text-sm font-bold text-foreground">Live Stream via Encoder</h3>
          <p className="text-[10px] text-muted-foreground">Use OBS, Streamyard, or any RTMP app</p>
        </div>
      </div>

      {/* Status Card */}
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

        {/* RTMP URL */}
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

      {/* Quick Steps */}
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

      <Button variant="destructive" size="lg" onClick={onEndStream} className="w-full">
        {isLive ? "End Stream" : "Cancel & Start Over"}
      </Button>
    </div>
  );
}
