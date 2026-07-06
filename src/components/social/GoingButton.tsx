import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface BaseProps {
  eventTitle: string;
  eventDate?: string;
  size?: "sm" | "md";
  variant?: "filled" | "compact";
  onChange?: (going: boolean) => void;
}

interface UplyEventProps extends BaseProps {
  eventId: string;
  globalEventId?: never;
}

interface GlobalEventProps extends BaseProps {
  eventId?: never;
  globalEventId: string;
}

type GoingButtonProps = UplyEventProps | GlobalEventProps;

export default function GoingButton(props: GoingButtonProps) {
  const { eventId, globalEventId, eventTitle, eventDate, size = "md", variant = "filled", onChange } = props as GoingButtonProps & { eventId?: string; globalEventId?: string };
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    markAttending,
    removeAttendance,
    markAttendingGlobal,
    removeGlobalAttendance,
    isGoingToGlobalEvent,
    isGoingToEvent,
  } = useAttendance();

  const [busy, setBusy] = useState(false);
  const isGoing = eventId
    ? isGoingToEvent(eventId)
    : isGoingToGlobalEvent(globalEventId!);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (isGoing) {
        if (eventId) await removeAttendance(eventId);
        else await removeGlobalAttendance(globalEventId!);
        toast.success("Removed from your plans");
        onChange?.(false);
      } else {
        if (eventId) {
          await markAttending({
            eventId,
            status: "going",
            date: eventDate ? new Date(eventDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          });
        } else {
          await markAttendingGlobal({
            globalEventId: globalEventId!,
            eventTitle,
            eventDate,
            status: "going",
          });
        }
        toast.success("You're going! 🎉");
        onChange?.(true);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  const isSm = size === "sm";
  const padding = isSm ? "px-2.5 py-1" : "px-4 py-2";
  const fontSize = isSm ? 11 : 13;

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`${padding} rounded-full font-bold transition-transform active:scale-95 inline-flex items-center gap-1`}
      style={{
        fontSize,
        backgroundColor: isGoing ? "rgba(61, 124, 255,0.15)" : variant === "filled" ? "#3D7CFF" : "hsl(var(--muted))",
        color: isGoing ? "#3D7CFF" : variant === "filled" ? "#0A0A0A" : "hsl(var(--foreground))",
        border: isGoing ? "1px solid rgba(61, 124, 255,0.4)" : "1px solid transparent",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isGoing ? (
        <>
          <Check className="w-3 h-3" /> Going
        </>
      ) : (
        "Going?"
      )}
    </button>
  );
}
