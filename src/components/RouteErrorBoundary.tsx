import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sentry } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Granular error boundary for specific route sections.
 * Unlike the global ErrorBoundary, this catches errors within a section
 * without taking down the entire app.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, {
      tags: { context: "route_error_boundary", section: this.props.section || "unknown" },
      extra: { componentStack: info.componentStack },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-16 px-4">
          <div className="max-w-sm text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {this.props.section ? `${this.props.section} failed to load` : "Something went wrong"}
            </h3>
            <p className="text-xs text-muted-foreground">
              This section encountered an error. The rest of the app is still working.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button size="sm" onClick={this.handleRetry} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.history.back()} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Go Back
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
