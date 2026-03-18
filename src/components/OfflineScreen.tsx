export default function OfflineScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <img src="/logo.png" alt="Uply" className="h-16 mb-6 opacity-60" />
      <h2 className="text-lg font-bold text-accent-green mb-2">You're offline</h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
        Check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 rounded-lg bg-accent-green text-accent-green-foreground font-semibold text-sm"
      >
        Retry
      </button>
    </div>
  );
}
