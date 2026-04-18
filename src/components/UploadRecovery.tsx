import { useAutoRecoverUploads } from "@/hooks/useAutoRecoverUploads";

/**
 * Mounts globally inside AuthProvider so that any orphaned recording
 * (chunks left in IndexedDB, or mux_assets stuck in "preparing") gets
 * automatically recovered the next time the user opens the app —
 * regardless of which page they land on.
 */
export default function UploadRecovery() {
  useAutoRecoverUploads();
  return null;
}
