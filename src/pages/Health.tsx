/**
 * /health — Deploy verification page.
 * Shows the exact commit + build timestamp that is live so we can confirm
 * the newest push is actually deployed.
 */
const APP_VERSION = (import.meta as any).env?.VITE_APP_VERSION || "dev";
const BUILD_COMMIT = (import.meta as any).env?.VITE_BUILD_COMMIT || "unknown";
const BUILD_TIME = (import.meta as any).env?.VITE_BUILD_TIME || "unknown";

export default function Health() {
  const rows: Array<[string, string]> = [
    ["App version", APP_VERSION],
    ["Git commit", BUILD_COMMIT],
    ["Built at", BUILD_TIME],
    ["User agent", typeof navigator !== "undefined" ? navigator.userAgent : "n/a"],
    ["URL", typeof window !== "undefined" ? window.location.href : "n/a"],
  ];

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">UPLY — Build health</h1>
          <p className="text-sm text-muted-foreground">
            Live build metadata. If the commit hash here doesn't match the latest commit on{" "}
            <code className="font-mono">main</code>, the deploy hasn't propagated yet.
          </p>
        </header>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <dl className="divide-y divide-border">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="col-span-2 font-mono break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
          >
            Reload
          </button>
          <a
            href="/"
            className="min-h-[44px] px-5 rounded-xl border border-border inline-flex items-center font-semibold"
          >
            Home
          </a>
        </div>
      </div>
    </main>
  );
}
