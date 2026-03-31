import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NetworkData {
  liveStreams: any[];
  scheduledStreams: any[];
  recentRecordings: any[];
  activeChannels: any[];
  tuneInCreators: any[];
  inactiveChannelCount: number;
  liveCount: number;
  isLoading: boolean;
  refetch: () => void;
}

const NetworkContext = createContext<NetworkData | null>(null);

const CACHE_TTL = 30000;

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState({
    liveStreams: [] as any[],
    scheduledStreams: [] as any[],
    recentRecordings: [] as any[],
    activeChannels: [] as any[],
    tuneInCreators: [] as any[],
    inactiveChannelCount: 0,
  });
  const [liveCount, setLiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const cacheRef = useRef<{ data: any; fetchedAt: number } | null>(null);

  const fetchNetworkData = useCallback(async () => {
    if (cacheRef.current && Date.now() - cacheRef.current.fetchedAt < CACHE_TTL) {
      setData(cacheRef.current.data);
      setLiveCount(cacheRef.current.data.liveStreams?.length || 0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("get-network-data", {
        body: { type: "all" },
      });
      if (response.data) {
        const d = response.data;
        cacheRef.current = { data: d, fetchedAt: Date.now() };
        setData(d);
        setLiveCount(d.liveStreams?.length || 0);
      }
    } catch (error) {
      console.error("Network data fetch failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworkData();
    const channel = supabase
      .channel("network-live-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mux_live_streams" },
        () => {
          cacheRef.current = null;
          fetchNetworkData();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchNetworkData]);

  return (
    <NetworkContext.Provider
      value={{ ...data, liveCount, isLoading, refetch: fetchNetworkData }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
};
