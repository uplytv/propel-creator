import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { motion } from "framer-motion";
import { RefreshCw, Image as ImageIcon, FlipHorizontal, Grid3x3 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import CameraTopBar from "@/components/camera/CameraTopBar";
import LeftToolRail from "@/components/camera/LeftToolRail";
import ModeSelector from "@/components/camera/ModeSelector";
import ModeChangeToast from "@/components/camera/ModeChangeToast";
import CaptureButton from "@/components/camera/CaptureButton";
import ShortMismatchModal from "@/components/camera/ShortMismatchModal";

import { useCameraStream } from "@/hooks/useCameraStream";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { hapticTick, hapticImpact } from "@/lib/cameraHaptics";
import {
  CAMERA_MODES,
  MODE_ASPECT_RATIO,
  MODE_MAX_SECONDS,
  POST_CAPTURE_ROUTE,
  type CameraMode,
} from "@/lib/cameraModes";
import { setCapturedMedia } from "@/lib/capturedMediaStore";
import { pickFromCameraRoll, probeVideoFile } from "@/lib/cameraRoll";
import { useAuth } from "@/context/AuthContext";

const LONG_PRESS_MS = 220;

export default function Camera() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const initialMode = (params.get("mode")?.toUpperCase() as CameraMode) || "SHORT";
  const [mode, setMode] = useState<CameraMode>(
    CAMERA_MODES.includes(initialMode) ? initialMode : "SHORT"
  );
  const [toastMode, setToastMode] = useState<CameraMode | null>(null);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [resolution, setResolution] = useState<"1080p" | "4K">("1080p");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showMismatch, setShowMismatch] = useState(false);

  // Camera enhancements (all wired to working UI)
  const FILTERS = [
    { name: "None", css: "none" },
    { name: "Vivid", css: "saturate(1.4) contrast(1.1)" },
    { name: "Mono", css: "grayscale(1) contrast(1.1)" },
    { name: "Warm", css: "sepia(0.4) saturate(1.2)" },
    { name: "Cool", css: "hue-rotate(-10deg) saturate(1.1) brightness(1.05)" },
    { name: "Fade", css: "contrast(0.9) brightness(1.05) saturate(0.85)" },
  ];
  const [filterIndex, setFilterIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [mirrorFront, setMirrorFront] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showText, setShowText] = useState(false);
  const [textOverlay, setTextOverlay] = useState("");

  const longPressTimer = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  const { videoRef, streamRef, isReady, error } = useCameraStream({
    facing,
    resolution,
    enabled: mode !== "LIVE", // LIVE routes immediately
  });

  const recorder = useMediaRecorder({
    streamRef,
    maxSeconds: MODE_MAX_SECONDS[mode] || 60,
    onAutoStop: () => {
      // The auto-stop handler in onTap finalizes the capture; nothing to do here.
    },
  });

  // Auto-route LIVE → /go-live as soon as it becomes the active mode.
  useEffect(() => {
    if (mode === "LIVE") {
      navigate("/go-live");
    }
  }, [mode, navigate]);

  // Show mode-change toast briefly
  const showModeToast = (m: CameraMode) => {
    setToastMode(m);
    window.setTimeout(() => setToastMode((cur) => (cur === m ? null : cur)), 800);
  };

  const changeMode = (next: CameraMode) => {
    if (next === mode) return;
    if (recorder.isRecording) return; // don't switch mid-record
    setMode(next);
    hapticTick();
    showModeToast(next);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const i = CAMERA_MODES.indexOf(mode);
      if (i < CAMERA_MODES.length - 1) changeMode(CAMERA_MODES[i + 1]);
    },
    onSwipedRight: () => {
      const i = CAMERA_MODES.indexOf(mode);
      if (i > 0) changeMode(CAMERA_MODES[i - 1]);
    },
    delta: 50,
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: false,
  });

  // ── Capture flows ───────────────────────────────────────────
  const finalizeVideo = async () => {
    if (!recorder.isRecording) return;
    const result = await recorder.stop();
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    setCapturedMedia({
      kind: "video",
      blob: result.blob,
      previewUrl: url,
      durationSeconds: result.seconds,
      mimeType: result.blob.type || "video/webm",
      caption: textOverlay.trim() || undefined,
    });
    hapticImpact();
    navigate(POST_CAPTURE_ROUTE[mode]);
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || !isReady) return;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 1080;
    const h = video.videoHeight || 1920;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Bake the active CSS filter into the captured photo so what you see is what you get.
    ctx.filter = FILTERS[filterIndex].css === "none" ? "none" : FILTERS[filterIndex].css;
    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.92)
    );
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setCapturedMedia({
      kind: "photo",
      blob,
      previewUrl: url,
      width: w,
      height: h,
      mimeType: "image/jpeg",
      caption: textOverlay.trim() || undefined,
    });
    hapticImpact();
    navigate(POST_CAPTURE_ROUTE[mode]);
  };

  const handleCaptureTap = async () => {
    if (mode === "LIVE") {
      navigate("/go-live");
      return;
    }
    // If a long-press already kicked off recording, treat this tap as "stop"
    if (recorder.isRecording) {
      await finalizeVideo();
      return;
    }
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (mode === "POST") {
      takePhoto();
      return;
    }
    if (mode === "STORY") {
      // Tap = photo by default
      takePhoto();
      return;
    }
    // SHORT and VIDEO: tap toggles recording
    recorder.start();
  };

  const handleLongPressStart = () => {
    if (mode === "POST" || mode === "STORY") {
      longPressTimer.current = window.setTimeout(() => {
        longPressFiredRef.current = true;
        recorder.start();
      }, LONG_PRESS_MS);
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if ((mode === "POST" || mode === "STORY") && recorder.isRecording) {
      finalizeVideo();
    }
  };

  // ── Camera roll import ───────────────────────────────────────
  const handleImport = async () => {
    const file = await pickFromCameraRoll({
      acceptImage: mode === "POST" || mode === "STORY",
      acceptVideo: mode !== "POST",
    });
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setCapturedMedia({
        kind: "photo",
        blob: file,
        previewUrl: url,
        fileName: file.name,
        mimeType: file.type,
      });
      navigate(POST_CAPTURE_ROUTE[mode === "LIVE" ? "POST" : mode]);
      return;
    }
    // Video import
    let meta = { durationSeconds: 0, width: 0, height: 0 };
    try {
      meta = await probeVideoFile(file);
    } catch {
      /* ignore probe errors */
    }
    if (mode === "SHORT") {
      const isVertical = meta.height >= meta.width;
      const tooLong = meta.durationSeconds > 60.5;
      if (!isVertical || tooLong) {
        setPendingFile(file);
        setShowMismatch(true);
        return;
      }
    }
    const url = URL.createObjectURL(file);
    setCapturedMedia({
      kind: "video",
      blob: file,
      previewUrl: url,
      width: meta.width,
      height: meta.height,
      durationSeconds: meta.durationSeconds,
      fileName: file.name,
      mimeType: file.type,
    });
    navigate(POST_CAPTURE_ROUTE[mode === "LIVE" ? "VIDEO" : mode]);
  };

  const handleMismatchPostAsVideo = () => {
    if (!pendingFile) return setShowMismatch(false);
    const url = URL.createObjectURL(pendingFile);
    setCapturedMedia({
      kind: "video",
      blob: pendingFile,
      previewUrl: url,
      fileName: pendingFile.name,
      mimeType: pendingFile.type,
    });
    setShowMismatch(false);
    setPendingFile(null);
    navigate(POST_CAPTURE_ROUTE.VIDEO);
  };

  const handleMismatchTrim = () => {
    if (!pendingFile) return setShowMismatch(false);
    const url = URL.createObjectURL(pendingFile);
    setCapturedMedia({
      kind: "video",
      blob: pendingFile,
      previewUrl: url,
      fileName: pendingFile.name,
      mimeType: pendingFile.type,
    });
    setShowMismatch(false);
    setPendingFile(null);
    // Editor will enforce 60s trim cap because mode = SHORT
    navigate(POST_CAPTURE_ROUTE.SHORT);
  };

  const handleClose = () => navigate(-1);

  // Aspect-ratio overlay for the viewfinder
  const aspectClass = useMemo(() => {
    const ar = MODE_ASPECT_RATIO[mode];
    if (ar === "9:16") return "aspect-[9/16]";
    if (ar === "1:1") return "aspect-square";
    if (ar === "4:5") return "aspect-[4/5]";
    return "h-full w-full";
  }, [mode]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="mb-4">Sign in to use the camera</p>
          <button
            onClick={() => navigate("/auth")}
            className="rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{ background: "#0A0A0A", color: "#fff" }}
    >
      <CameraTopBar
        flash={flash}
        resolution={resolution}
        onClose={handleClose}
        onToggleFlash={() => setFlash((f) => (f === "off" ? "on" : f === "on" ? "auto" : "off"))}
        onToggleResolution={() => setResolution((r) => (r === "4K" ? "1080p" : "4K"))}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Viewfinder + swipe surface */}
      <div {...swipeHandlers} className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`relative overflow-hidden rounded-[2px] bg-black ${aspectClass}`}
            style={{ maxHeight: "100%", maxWidth: "100%" }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
              style={{
                transform: facing === "front" && mirrorFront ? "scaleX(-1)" : undefined,
                filter: FILTERS[filterIndex].css,
              }}
            />
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
                {error ? error : "Starting camera…"}
              </div>
            )}

            {/* Rule-of-thirds grid overlay */}
            {showGrid && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/3 top-0 h-full w-px bg-white/30" />
                <div className="absolute left-2/3 top-0 h-full w-px bg-white/30" />
                <div className="absolute top-1/3 left-0 w-full h-px bg-white/30" />
                <div className="absolute top-2/3 left-0 w-full h-px bg-white/30" />
              </div>
            )}

            {/* Text overlay (caption preview pinned over the viewfinder) */}
            {textOverlay.trim() && (
              <div className="pointer-events-none absolute inset-x-4 bottom-6 z-20 text-center">
                <span className="inline-block max-w-full rounded-lg bg-black/55 px-3 py-1.5 text-base font-bold text-white backdrop-blur-sm">
                  {textOverlay}
                </span>
              </div>
            )}

            {/* Filter name pill */}
            {filterIndex > 0 && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                {FILTERS[filterIndex].name}
              </div>
            )}
          </div>
        </div>

        <LeftToolRail
          mode={mode}
          filterIndex={filterIndex}
          onCycleFilter={() => {
            setFilterIndex((i) => (i + 1) % FILTERS.length);
            hapticTick();
          }}
          onText={() => setShowText(true)}
          onLoop={() => toast("Boomerang/loop coming soon")}
          onLayout={() => toast("Layout/collage coming soon")}
        />

        {/* Recording timer bar (top of viewfinder) for SHORT/VIDEO/STORY */}
        {recorder.isRecording && MODE_MAX_SECONDS[mode] > 0 && (
          <div className="absolute left-0 right-0 top-[80px] z-30 mx-6">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full"
                style={{ background: "#00FF85" }}
                animate={{
                  width: `${Math.min(100, (recorder.elapsed / MODE_MAX_SECONDS[mode]) * 100)}%`,
                }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <div className="mt-1 text-right text-[11px] font-semibold text-white/80">
              {recorder.elapsed.toFixed(1)}s / {MODE_MAX_SECONDS[mode]}s
            </div>
          </div>
        )}
      </div>

      <ModeChangeToast mode={toastMode} />

      {/* Bottom controls */}
      <div
        className="relative z-30 shrink-0 px-4 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <ModeSelector active={mode} onChange={changeMode} />

        <div className="mt-2 flex items-center justify-between">
          <button
            aria-label="Open camera roll"
            onClick={handleImport}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 backdrop-blur-md"
          >
            <ImageIcon className="h-5 w-5 text-white" />
          </button>

          <CaptureButton
            mode={mode}
            isRecording={recorder.isRecording}
            recordingSeconds={recorder.elapsed}
            onTap={handleCaptureTap}
            onLongPressStart={handleLongPressStart}
            onLongPressEnd={handleLongPressEnd}
          />

          <button
            aria-label="Flip camera"
            onClick={() => setFacing((f) => (f === "front" ? "back" : "front"))}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-md"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ShortMismatchModal
        open={showMismatch}
        onPostAsVideo={handleMismatchPostAsVideo}
        onTrim={handleMismatchTrim}
        onCancel={() => {
          setShowMismatch(false);
          setPendingFile(null);
        }}
      />
    </div>
  );
}
