import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";

type UnlockType = "purchase" | "subscription" | "both";

export interface LockTrackEditorValue {
  is_locked: boolean;
  unlock_type: UnlockType | null;
  unlock_price_cents: number | null;
  required_tier_id: string | null;
  release_status: "released" | "unreleased";
  scheduled_release_at: string | null;
  preview_start_seconds: number;
  preview_duration_seconds: number;
  preview_url: string | null;
  allow_download: boolean;
}

interface Props {
  value: LockTrackEditorValue;
  onChange: (v: LockTrackEditorValue) => void;
}

/**
 * Additive form section for the existing upload/edit flow.
 * Drop into MusicUpload (or any track editor) and persist the resulting value
 * onto the tracks row when saving.
 */
export default function LockTrackEditor({ value, onChange }: Props) {
  const { user } = useAuth();
  const [v, setV] = useState<LockTrackEditorValue>(value);

  useEffect(() => onChange(v), [v]);

  const { data: tiers } = useQuery({
    queryKey: ["my-tiers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_tiers")
        .select("id, name, price_monthly")
        .eq("creator_id", user!.id)
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const set = <K extends keyof LockTrackEditorValue>(k: K, val: LockTrackEditorValue[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="flex items-center gap-2 font-semibold text-white">
          <Lock className="w-4 h-4" /> Lock as unreleased
        </span>
        <input
          type="checkbox"
          checked={v.is_locked}
          onChange={(e) => {
            const next = e.target.checked;
            setV((p) => ({
              ...p,
              is_locked: next,
              release_status: next ? "unreleased" : "released",
              unlock_type: next ? (p.unlock_type ?? "purchase") : null,
            }));
          }}
          className="w-5 h-5"
        />
      </label>

      {v.is_locked && (
        <>
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-2 uppercase">Unlock method</label>
            <div className="flex gap-2 flex-wrap">
              {(["purchase", "subscription", "both"] as UnlockType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("unlock_type", t)}
                  className="min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold"
                  style={{
                    background: v.unlock_type === t
                      ? "linear-gradient(135deg, #3D7CFF 0%, #B025FF 100%)"
                      : "rgba(255,255,255,0.06)",
                    color: "#fff",
                  }}
                >
                  {t === "purchase" ? "One-time purchase" : t === "subscription" ? "Subscription" : "Both"}
                </button>
              ))}
            </div>
          </div>

          {(v.unlock_type === "purchase" || v.unlock_type === "both") && (
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2 uppercase">Unlock price (USD)</label>
              <input
                type="number"
                min={1}
                step={0.01}
                value={(v.unlock_price_cents ?? 0) / 100 || ""}
                onChange={(e) => set("unlock_price_cents", Math.round(parseFloat(e.target.value || "0") * 100) || null)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white/5 text-white text-base"
                placeholder="2.99"
              />
            </div>
          )}

          {(v.unlock_type === "subscription" || v.unlock_type === "both") && (
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2 uppercase">Required tier</label>
              <select
                value={v.required_tier_id ?? ""}
                onChange={(e) => set("required_tier_id", e.target.value || null)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white/5 text-white text-base"
              >
                <option value="">Select a tier…</option>
                {tiers?.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (${Number(t.price_monthly).toFixed(2)}/mo)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2 uppercase">Preview start (s)</label>
              <input
                type="number" min={0}
                value={v.preview_start_seconds}
                onChange={(e) => set("preview_start_seconds", parseInt(e.target.value || "0", 10))}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white/5 text-white text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2 uppercase">Preview length (s)</label>
              <input
                type="number" min={5} max={120}
                value={v.preview_duration_seconds}
                onChange={(e) => set("preview_duration_seconds", parseInt(e.target.value || "45", 10))}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white/5 text-white text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-2 uppercase">Preview clip URL (optional fallback)</label>
            <input
              type="url"
              value={v.preview_url ?? ""}
              onChange={(e) => set("preview_url", e.target.value || null)}
              placeholder="https://… (auto-generated if blank)"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white/5 text-white text-base"
            />
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-white/80">Allow download after unlock</span>
            <input type="checkbox" checked={v.allow_download} onChange={(e) => set("allow_download", e.target.checked)} className="w-5 h-5" />
          </label>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-2 uppercase">Scheduled release (optional)</label>
            <input
              type="datetime-local"
              value={v.scheduled_release_at ? v.scheduled_release_at.slice(0, 16) : ""}
              onChange={(e) => set("scheduled_release_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white/5 text-white text-base"
            />
          </div>
        </>
      )}
    </div>
  );
}
