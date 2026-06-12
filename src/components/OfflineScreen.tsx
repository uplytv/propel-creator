export default function OfflineScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background px-6">
      <img src="/logo.png" alt="UPLY" className="h-16 mb-6 opacity-70" />
      <h2 className="text-lg font-bold mb-2 bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)] bg-clip-text text-transparent">
        You're offline
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
        Check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
      >
        Retry
      </button>
    </div>
  );
}
