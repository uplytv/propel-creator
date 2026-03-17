import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";

// Initialize monitoring
initSentry();
initPostHog();

const SentryApp = import.meta.env.VITE_SENTRY_DSN
  ? Sentry.withErrorBoundary(App, {
      fallback: (
        <div className="flex min-h-screen items-center justify-center bg-background p-8 text-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">We've been notified and are looking into it.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium">
              Reload Page
            </button>
          </div>
        </div>
      ),
    })
  : App;

createRoot(document.getElementById("root")!).render(<SentryApp />);
