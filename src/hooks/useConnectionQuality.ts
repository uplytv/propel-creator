import { useState, useEffect, useRef } from "react";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor";

interface ConnectionState {
  quality: ConnectionQuality;
  rttMs: number | null;
  downlinkMbps: number | null;
  effectiveType: string | null;
}

function qualityFromMetrics(rtt: number | null, downlink: number | null, effectiveType: string | null): ConnectionQuality {
  // Use Network Information API data if available
  if (effectiveType) {
    if (effectiveType === "4g" && (downlink ?? 10) >= 5) return "excellent";
    if (effectiveType === "4g") return "good";
    if (effectiveType === "3g") return "fair";
    return "poor";
  }
  // Fallback: use measured RTT
  if (rtt !== null) {
    if (rtt < 100) return "excellent";
    if (rtt < 250) return "good";
    if (rtt < 500) return "fair";
    return "poor";
  }
  return "good"; // default
}

export function useConnectionQuality(enabled: boolean = true): ConnectionState {
  const [state, setState] = useState<ConnectionState>({
    quality: "good",
    rttMs: null,
    downlinkMbps: null,
    effectiveType: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const update = () => {
      const conn = (navigator as any).connection;
      const rtt = conn?.rtt ?? null;
      const downlink = conn?.downlink ?? null;
      const effectiveType = conn?.effectiveType ?? null;
      const quality = qualityFromMetrics(rtt, downlink, effectiveType);
      setState({ quality, rttMs: rtt, downlinkMbps: downlink, effectiveType });
    };

    update();

    // Listen to Network Information API changes
    const conn = (navigator as any).connection;
    if (conn?.addEventListener) {
      conn.addEventListener("change", update);
    }

    // Poll every 5s as fallback
    intervalRef.current = setInterval(update, 5000);

    return () => {
      if (conn?.removeEventListener) {
        conn.removeEventListener("change", update);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  return state;
}
