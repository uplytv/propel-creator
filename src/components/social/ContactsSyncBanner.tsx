import { useState } from "react";
import { useInviteCodes } from "@/hooks/useInviteCodes";
import { X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ContactsSyncBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("uply_contacts_synced") === "1"
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("uply_contacts_synced", "1");
    setDismissed(true);
  };

  const handleInvite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join UPLY",
          text: "Join me on UPLY — the #1 nightlife social platform",
          url: window.location.origin,
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success("Link copied!");
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <div
      className="mx-4 mt-3 rounded-xl p-4 relative"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <button onClick={handleDismiss} className="absolute top-3 right-3">
        <X className="w-4 h-4 text-white/30" />
      </button>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(61, 124, 255,0.1)" }}>
          <Users className="w-5 h-5" style={{ color: "#3D7CFF" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Find your friends on UPLY</p>
          <p className="text-xs text-white/40 mt-0.5">Invite friends to join the scene</p>
        </div>
      </div>
      <Button
        onClick={handleInvite}
        className="w-full mt-3 font-semibold text-sm"
        style={{ backgroundColor: "#3D7CFF", color: "#000" }}
      >
        Invite via Link
      </Button>
    </div>
  );
}
