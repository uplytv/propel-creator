const shimmerStyle = {
  background: "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 100%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s linear infinite",
};

export function PrimetimeSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div style={{ ...shimmerStyle, aspectRatio: "16/9" }} />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/5 rounded" style={shimmerStyle} />
        <div className="h-3 w-2/5 rounded" style={shimmerStyle} />
      </div>
    </div>
  );
}

export function ChannelRowSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[140px] h-[120px] rounded-lg p-3 space-y-2" style={{ background: "hsl(var(--card))" }}>
          <div className="w-10 h-10 rounded-full mx-auto" style={shimmerStyle} />
          <div className="h-3 w-4/5 mx-auto rounded" style={shimmerStyle} />
          <div className="h-2 w-3/5 mx-auto rounded" style={shimmerStyle} />
        </div>
      ))}
    </div>
  );
}

export function TonightSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[200px] h-[140px] rounded-lg" style={shimmerStyle} />
      ))}
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 h-16 rounded-lg px-3" style={{ background: "hsl(var(--card))" }}>
          <div className="w-12 h-10 rounded" style={shimmerStyle} />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/5 rounded" style={shimmerStyle} />
            <div className="h-2 w-2/5 rounded" style={shimmerStyle} />
          </div>
        </div>
      ))}
    </div>
  );
}
