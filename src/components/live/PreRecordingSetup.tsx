import { RefObject } from "react";
import {
  Video, VideoOff, Mic, MicOff, Monitor, Camera,
  RotateCcw, Volume2, Circle, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturedProductPicker, { type Product } from "./FeaturedProductPicker";
import LinkEventToStream from "./LinkEventToStream";

interface PreRecordingSetupProps {
  title: string;
  videoRef: RefObject<HTMLVideoElement>;
  videoContainerRef: RefObject<HTMLDivElement>;
  cameraOn: boolean;
  micOn: boolean;
  screenShare: boolean;
  audioLevel: number;
  mediaError: string | null;
  uploadFailed: boolean;
  uploadErrorMsg: string;
  isRecording: boolean;
  isUploading: boolean;
  products: Product[];
  featuredProductId?: string | null;
  onFeaturedProductChange?: (id: string | null) => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onStartCamera: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onFlipCamera: () => void;
  onStartRecording: () => void;
  onDismissError: () => void;
  onGoBack: () => void;
}

export default function PreRecordingSetup({
  title,
  videoRef,
  videoContainerRef,
  cameraOn,
  micOn,
  screenShare,
  audioLevel,
  mediaError,
  uploadFailed,
  uploadErrorMsg,
  isRecording,
  isUploading,
  products,
  featuredProductId,
  onFeaturedProductChange,
  onToggleCamera,
  onToggleMic,
  onStartCamera,
  onStartScreenShare,
  onStopScreenShare,
  onFlipCamera,
  onStartRecording,
  onDismissError,
  onGoBack,
}: PreRecordingSetupProps) {
  return (
    <div className="space-y-4 mobile-safe-content">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onGoBack} className="text-muted-foreground hover:text-foreground transition-colors">
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
        className={`relative overflow-hidden bg-black rounded-2xl border border-border w-full min-h-[14rem] max-h-[52dvh] sm:max-h-[60vh] ${
          screenShare ? "aspect-video" : "mx-auto max-w-sm aspect-[9/14]"
        }`}
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
              <Button variant="outline" size="sm" onClick={onStartCamera}>
                <Camera className="w-4 h-4 mr-1.5" /> Camera
              </Button>
              <Button variant="outline" size="sm" onClick={onStartScreenShare}>
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
                      ? i < 5 ? "hsl(var(--success))" : i < 7 ? "hsl(var(--warning))" : "hsl(var(--destructive))"
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
              <Button size="sm" variant="outline" className="mt-3" onClick={onDismissError}>Dismiss</Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant={cameraOn ? "default" : "outline"} size="icon" onClick={onToggleCamera} className="rounded-full w-10 h-10 sm:w-11 sm:h-11">
          {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </Button>
        <Button variant={micOn ? "default" : "outline"} size="icon" onClick={onToggleMic} disabled={!cameraOn && !screenShare} className="rounded-full w-10 h-10 sm:w-11 sm:h-11">
          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
        <Button
          variant={screenShare ? "default" : "outline"}
          size="icon"
          onClick={screenShare ? onStopScreenShare : onStartScreenShare}
          className="rounded-full w-10 h-10 sm:w-11 sm:h-11"
        >
          <Monitor className="w-4 h-4" />
        </Button>
        {cameraOn && (
          <Button variant="outline" size="icon" onClick={onFlipCamera} className="rounded-full w-10 h-10 sm:w-11 sm:h-11">
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
        <Button variant="hero" size="lg" onClick={onStartRecording} className="w-full">
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
        <Button variant="ghost" size="sm" onClick={onGoBack} className="w-full text-muted-foreground">
          ← Choose Different Method
        </Button>
      )}
    </div>
  );
}
