import { useEffect, useRef, useState } from "react";
import { Play, Info, Bell, Volume2, VolumeX, Zap } from "lucide-react";
import UplyLogo from "@/components/shared/UplyLogo";

const PLATFORMS = ["YT", "TT", "IG", "TW", "X", "KK", "FB", "LI"];

export default function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio > 0.35) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: [0, 0.15, 0.35, 0.6, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ height: "92vh", minHeight: 640 }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted={muted}
        loop
        playsInline
        poster="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&q=80"
        src="https://cdn.pixabay.com/video/2024/03/15/204276-924698132_large.mp4"
      />

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,255,133,0.15),_transparent_50%)]" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end pb-28 px-6 lg:px-12 animate-[fadeUp_0.9s_ease-out] motion-reduce:animate-none">
        <div className="max-w-[780px] flex flex-col gap-5">
          {/* Original badge */}
          <div className="flex items-center gap-2">
            <UplyLogo size={20} />
            <span
              className="text-[10px] font-bold text-[#00FF85]"
              style={{ letterSpacing: "0.3em" }}
            >
              U · P · L · Y &nbsp;&nbsp;O R I G I N A L
            </span>
          </div>

          {/* Title */}
          <h1 className="font-extrabold text-white text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95]">
            NEON <br /> HOURS
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-[#FF2D55] px-2.5 py-1 rounded text-white text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none" />
              LIVE
            </span>
            <span className="bg-white/10 backdrop-blur-sm text-white/90 text-[11px] font-medium px-2.5 py-1 rounded">
              12,483 watching
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-[11px] font-medium px-2.5 py-1 rounded">
              <Zap className="w-3 h-3 fill-[#00FF85] text-[#00FF85]" />
              Simulcasting to 8 platforms
            </span>
            <span className="border border-white/20 text-white/80 text-[10px] font-bold px-1.5 py-0.5 rounded">
              TV-MA
            </span>
          </div>

          {/* Description */}
          <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-[560px]">
            A late-night live talk show built by creators, for creators. Eight platforms.
            One signal. Tonight's guests are deciding the future of the creator economy
            in real time.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button className="inline-flex items-center gap-2 bg-white text-black font-bold text-sm px-6 py-2.5 rounded hover:bg-white/90 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85]">
              <Play className="w-4 h-4 fill-black" />
              Watch Live
            </button>
            <button className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/10 text-white font-semibold text-sm px-5 py-2.5 rounded hover:bg-white/20 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85]">
              <Info className="w-4 h-4" />
              More Info
            </button>
            <button className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium text-sm px-3 py-2.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85] rounded">
              <Bell className="w-4 h-4" />
              Remind Me
            </button>
          </div>
        </div>
      </div>

      {/* Bottom-left LIVE ON strip */}
      <div className="absolute bottom-8 left-6 lg:left-12 flex items-center gap-3 z-10">
        <span
          className="text-[10px] font-bold text-white/50"
          style={{ letterSpacing: "0.2em" }}
        >
          LIVE ON
        </span>
        <div className="flex items-center gap-1.5">
          {PLATFORMS.map((p) => (
            <div
              key={p}
              className="w-7 h-7 rounded-md bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-[9px] font-bold text-white/85"
            >
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Mute toggle bottom-right */}
      <button
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute bottom-8 right-6 lg:right-12 w-10 h-10 rounded-full border-2 border-white/40 hover:border-white bg-black/30 backdrop-blur-sm flex items-center justify-center text-white transition cursor-pointer z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85]"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </section>
  );
}
