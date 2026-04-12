/**
 * Standardized React Query utilities for consistent error handling and caching.
 */
import { Sentry } from "@/lib/sentry";
import { toast } from "sonner";

/** Standard stale times for different data types */
export const STALE_TIMES = {
  /** Real-time data: profiles, notifications, chat — 10s */
  REALTIME: 10_000,
  /** Frequently changing: feeds, events — 30s */
  FREQUENT: 30_000,
  /** Moderately stable: settings, preferences — 60s */
  MODERATE: 60_000,
  /** Rarely changing: categories, config — 5min */
  STABLE: 300_000,
} as const;

/** Standard query options for consistent behavior */
export const defaultQueryOptions = {
  staleTime: STALE_TIMES.FREQUENT,
  retry: 2,
  refetchOnWindowFocus: false,
} as const;

/**
 * Handles a Supabase query error consistently:
 * 1. Logs to Sentry with context
 * 2. Optionally shows a toast
 * 3. Re-throws for React Query to handle
 */
export function handleQueryError(error: unknown, context: string, showToast = false): never {
  Sentry.captureException(error, {
    tags: { context: "supabase_query", query: context },
  });
  if (showToast) {
    toast.error("Something went wrong. Please try again.");
  }
  throw error;
}
