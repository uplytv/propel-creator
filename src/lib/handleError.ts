import { toast } from "@/hooks/use-toast";

/**
 * Centralized error handler — shows a user-friendly toast for any caught error.
 * Use in catch blocks, .catch() chains, or onError callbacks.
 *
 * @param error  The caught error (Error, string, or unknown)
 * @param fallback  A user-friendly fallback message if the error has no message
 */
export function handleError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;

  // Suppress Supabase "JWT expired" — handled by auth refresh
  if (message.includes("JWT expired") || message.includes("refresh_token")) return;

  console.error("[handleError]", error);

  toast({
    title: "Error",
    description: message.length > 200 ? message.slice(0, 200) + "…" : message,
    variant: "destructive",
  });
}

/**
 * Wraps an async function so any thrown error is caught and shown as a toast.
 */
export function withErrorToast<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  fallback?: string
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      handleError(err, fallback);
      return undefined;
    }
  };
}
