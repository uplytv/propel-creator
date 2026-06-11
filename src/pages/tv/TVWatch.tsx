import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UPLYMuxPlayer } from "@/components/MuxPlayer";
import { QRCodeCanvas } from "qrcode.react";
import SEOHead from "@/components/SEOHead";

interface Stream {
  id: string;
  title: string | null;
  mux_playback_id: string | null;
  viewer_count: number | null;
  orientation: string | null;
}

interface ActiveFeature {
  id: string;
  product_id: string;
  checkout_token: string;
  expires_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

export default function TVWatch() {
  const { streamId } = useParams<{ streamId: string }>();
  const [stream, setStream] = useState<Stream | null>(null);
  const [feature, setFeature] = useState<ActiveFeature | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [chat, setChat] = useState<{ id: string; user: string; text: string }[]>([]);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Load stream
  useEffect(() => {
    if (!streamId) return;
    (async () => {
      const { data } = await supabase
        .from("mux_live_streams")
        .select("id, title, mux_playback_id, viewer_count, orientation, status")
        .eq("id", streamId)
        .maybeSingle();
      if (!data || (data as any).orientation === "portrait") {
        setStream(null);
        return;
      }
      setStream(data as any);
    })();
  }, [streamId]);

  // Load active TV feature + subscribe
  useEffect(() => {
    if (!streamId) return;
    const fetchActive = async () => {
      const { data } = await supabase
        .from("tv_product_features")
        .select("id, product_id, checkout_token, expires_at, dismissed_at")
        .eq("stream_id", streamId)
        .is("dismissed_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("featured_at", { ascending: false })
        .limit(1);
      const row = (data as any)?.[0];
      setFeature(row || null);
      if (row) {
        const { data: prod } = await supabase
          .from("products").select("id, name, price, image_url").eq("id", row.product_id).maybeSingle();
        setProduct((prod as any) || null);
      } else setProduct(null);
    };
    fetchActive();

    const channel = supabase
      .channel(`tv-feature-${streamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tv_product_features", filter: `stream_id=eq.${streamId}` }, fetchActive)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  // Load + subscribe chat (last ~10 msgs across ticker)
  useEffect(() => {
    if (!streamId) return;
    const channel = supabase
      .channel(`tv-chat-${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stream_chat_messages", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          setChat((prev) => [...prev.slice(-10), {
            id: payload.new.id,
            user: payload.new.username || "Viewer",
            text: payload.new.message || "",
          }]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  if (!streamId) return null;
  if (!stream) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
        <p className="opacity-60">Stream unavailable on UPLY TV.</p>
      </div>
    );
  }

  const buyUrl = feature
    ? `${window.location.origin}/buy/${feature.checkout_token}`
    : null;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <SEOHead title={`${stream.title || "Live"} · UPLY TV`} description="Watch live on UPLY TV." />

      {/* Video */}
      <div className="absolute inset-0">
        {stream.mux_playback_id && (
          <UPLYMuxPlayer playbackId={stream.mux_playback_id} streamType="ll-live" autoPlay muted={false} />
        )}
      </div>

      {/* Top-right HUD */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
        <span className="bg-red-600 text-white text-sm font-bold px-3 py-1 rounded">LIVE</span>
        <span className="bg-black/60 px-3 py-1 rounded text-sm">{stream.viewer_count ?? 0} watching</span>
      </div>

      {/* Title overlay */}
      <div className="absolute top-6 left-6 z-20">
        <div className="text-2xl font-bold drop-shadow-lg">{stream.title}</div>
        <div className="text-xs opacity-60 mt-1">UPLY TV · Press OK for products</div>
      </div>

      {/* Chat ticker bottom */}
      <div ref={tickerRef} className="absolute bottom-0 inset-x-0 px-12 pb-6 z-10 pointer-events-none">
        <div className="space-y-1 opacity-30">
          {chat.slice(-3).map((m) => (
            <div key={m.id} className="text-sm">
              <span className="text-[#3D7CFF] font-semibold">{m.user}:</span> <span>{m.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured product overlay (right third) */}
      {feature && product && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-[40%] max-w-md bg-[#0A0A0A]/95 border-2 border-[#3D7CFF] rounded-2xl p-6 z-30 shadow-2xl animate-in slide-in-from-right">
          {product.image_url && (
            <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-xl mb-4" />
          )}
          <div className="text-2xl font-bold mb-1">{product.name}</div>
          <div className="text-3xl font-black text-[#3D7CFF] mb-4">${Number(product.price).toFixed(2)}</div>
          <div className="bg-white p-4 rounded-xl flex justify-center mb-3">
            {buyUrl && <QRCodeCanvas value={buyUrl} size={240} />}
          </div>
          <p className="text-center text-base font-semibold">Scan to buy on your phone</p>
          <p className="text-center text-xs opacity-50 mt-1">
            Live until {new Date(feature.expires_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  );
}
