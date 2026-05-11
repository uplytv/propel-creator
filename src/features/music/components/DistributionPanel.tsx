import { useState } from "react";
import { useRoyaltySplits } from "../hooks/useRoyaltySplits";
import { useDistributionExports } from "../hooks/useDistributionExports";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import { SUPPORTED_DSPS, useReleaseTargets } from "../hooks/useDistribution";
import ReleaseStatusRow from "./ReleaseStatusRow";

interface Props {
  trackId: string;
  isOwner: boolean;
}

export default function DistributionPanel({ trackId, isOwner }: Props) {
  const qc = useQueryClient();
  const { data: track } = useQuery({
    queryKey: ["track-meta", trackId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tracks")
        .select("isrc, iswc, label, copyright_notice, is_explicit")
        .eq("id", trackId)
        .maybeSingle();
      return data;
    },
  });

  const { data: splits = [], addSplit, removeSplit, totalPercent } = useRoyaltySplits(trackId);
  useDistributionExports(trackId);

  // Find or allow creating a release row for this track (Release Tracker)
  const { data: release } = useQuery({
    queryKey: ["distribution-release-by-track", trackId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("music_distribution_releases")
        .select("id, title, artist_name")
        .eq("track_id", trackId)
        .maybeSingle();
      return data as { id: string; title: string; artist_name: string } | null;
    },
  });

  const createReleaseForTrack = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: t } = await (supabase as any)
        .from("tracks")
        .select("title, creator_id, profiles:creator_id(display_name, username)")
        .eq("id", trackId)
        .maybeSingle();
      const artistName =
        t?.profiles?.display_name || t?.profiles?.username || "Unknown artist";
      const { error } = await (supabase as any)
        .from("music_distribution_releases")
        .insert({
          owner_id: u.user.id,
          track_id: trackId,
          title: t?.title ?? "Untitled",
          artist_name: artistName,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["distribution-release-by-track", trackId] });
    },
  });

  const { data: targets } = useReleaseTargets(release?.id);
  const targetByPlatform = new Map((targets ?? []).map((t) => [t.platform, t]));

  const updateMeta = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await (supabase as any).from("tracks").update(patch).eq("id", trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["track-meta", trackId] });
      toast({ title: "Saved" });
    },
  });

  const [meta, setMeta] = useState({ isrc: "", iswc: "", label: "", copyright_notice: "" });
  const [collab, setCollab] = useState({ collaborator_id: "", role: "artist", percent: 0 });

  if (!isOwner) return null;

  const isrc = meta.isrc || track?.isrc || "";
  const iswc = meta.iswc || track?.iswc || "";
  const label = meta.label || track?.label || "";
  const copyright = meta.copyright_notice || track?.copyright_notice || "";

  return (
    <div className="space-y-6">
      {/* Release Tracker (compact) */}
      <section className="rounded-xl bg-white/5 p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="text-white font-bold text-sm">Release status</h3>
          <p className="text-white/40 text-xs">
            UPLY tracks status only — distribute via your DSP service of choice.
          </p>
        </div>

        {!release && (
          <button
            onClick={() => createReleaseForTrack.mutate()}
            disabled={createReleaseForTrack.isPending}
            className="w-full rounded-lg bg-white/10 text-white font-bold py-3 text-sm"
            style={{ minHeight: 44 }}
          >
            {createReleaseForTrack.isPending ? "Creating…" : "Start tracking this release"}
          </button>
        )}

        {release && (
          <div className="space-y-2">
            {SUPPORTED_DSPS.map((p) => (
              <ReleaseStatusRow
                key={p}
                releaseId={release.id}
                platform={p}
                target={targetByPlatform.get(p)}
                compact
              />
            ))}
          </div>
        )}
      </section>

      {/* Rights & metadata */}
      <section className="rounded-xl bg-white/5 p-4 space-y-3">
        <h3 className="text-white font-bold text-sm">Rights &amp; metadata</h3>
        <Input label="ISRC" value={isrc} onChange={(v) => setMeta({ ...meta, isrc: v })} placeholder="US-XXX-YY-NNNNN" />
        <Input label="ISWC" value={iswc} onChange={(v) => setMeta({ ...meta, iswc: v })} placeholder="T-XXX.XXX.XXX-N" />
        <Input label="Label" value={label} onChange={(v) => setMeta({ ...meta, label: v })} />
        <Input label="Copyright" value={copyright} onChange={(v) => setMeta({ ...meta, copyright_notice: v })} placeholder="© 2026 Artist Name" />
        <button
          onClick={() => updateMeta.mutate({ isrc, iswc, label, copyright_notice: copyright })}
          className="w-full rounded-lg bg-[#00FF85] text-black font-bold py-3 text-sm"
          style={{ minHeight: 44 }}
        >
          Save metadata
        </button>
      </section>

      {/* Royalty splits */}
      <section className="rounded-xl bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm">Royalty Splits</h3>
          <span className={`text-xs font-bold ${totalPercent === 100 ? "text-[#00FF85]" : "text-yellow-400"}`}>
            {totalPercent.toFixed(0)}% / 100%
          </span>
        </div>

        {splits.length === 0 && (
          <p className="text-white/40 text-xs">No collaborators yet. Add splits below.</p>
        )}

        {splits.map((s) => (
          <div key={s.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{s.collaborator_id.slice(0, 8)}…</p>
              <p className="text-white/40 text-xs">{s.role}</p>
            </div>
            <span className="text-[#00FF85] font-bold text-sm">{Number(s.percent).toFixed(1)}%</span>
            <button
              onClick={() => removeSplit.mutate(s.id)}
              className="p-2 rounded-lg bg-white/5 text-white/60"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="space-y-2 pt-2 border-t border-white/10">
          <Input
            label="Collaborator User ID"
            value={collab.collaborator_id}
            onChange={(v) => setCollab({ ...collab, collaborator_id: v })}
            placeholder="uuid"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Role" value={collab.role} onChange={(v) => setCollab({ ...collab, role: v })} />
            <Input
              label="Percent"
              value={String(collab.percent)}
              onChange={(v) => setCollab({ ...collab, percent: Number(v) || 0 })}
              type="number"
            />
          </div>
          <button
            onClick={() => {
              if (!collab.collaborator_id || !collab.percent) return;
              addSplit.mutate(collab, {
                onSuccess: () => setCollab({ collaborator_id: "", role: "artist", percent: 0 }),
              });
            }}
            className="w-full rounded-lg bg-white/10 text-white font-bold py-3 text-sm flex items-center justify-center gap-2"
            style={{ minHeight: 44 }}
          >
            <Plus className="w-4 h-4" /> Add Split
          </button>
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <label className="block">
      <span className="text-white/60 text-xs font-medium block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 text-white rounded-lg px-3 py-2.5 border border-white/10 placeholder:text-white/30"
        style={{ fontSize: 16, minHeight: 44 }}
      />
    </label>
  );
}
