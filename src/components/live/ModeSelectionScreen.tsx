import { Camera, Monitor, Radio, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModeSelectionScreenProps {
  onSelectBrowserRecord: () => void;
  onSelectExternalEncoder: () => void;
  onGoBack: () => void;
}

export default function ModeSelectionScreen({
  onSelectBrowserRecord,
  onSelectExternalEncoder,
  onGoBack,
}: ModeSelectionScreenProps) {
  return (
    <div className="space-y-4">
      <div className="glass-card p-5 text-center">
        <Radio className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground mb-1">Choose Your Broadcast Method</h3>
        <p className="text-xs text-muted-foreground">How would you like to create content?</p>
      </div>

      <button
        onClick={onSelectBrowserRecord}
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
        onClick={onSelectExternalEncoder}
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

      <Button variant="ghost" size="sm" onClick={onGoBack} className="w-full text-muted-foreground">
        ← Go Back
      </Button>
    </div>
  );
}
