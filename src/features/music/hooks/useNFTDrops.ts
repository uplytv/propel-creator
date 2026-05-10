import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NFTDrop {
  id: string;
  owner_id: string;
  track_id: string | null;
  title: string;
  description: string | null;
  artwork_url: string | null;
  edition_size: number;
  price_cents: number;
  currency: string;
  chain: string;
  contract_address: string | null;
  status: string;
  drop_starts_at: string | null;
  drop_ends_at: string | null;
  minted_count: number;
  created_at: string;
  updated_at: string;
}

export interface NFTEdition {
  id: string;
  drop_id: string;
  edition_number: number;
  owner_user_id: string | null;
  wallet_address: string | null;
  tx_hash: string | null;
  minted_at: string;
}

export function useLiveNFTDrops() {
  return useQuery({
    queryKey: ["nft-drops", "live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_nft_drops")
        .select("*")
        .in("status", ["live", "sold_out", "ended"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as NFTDrop[];
    },
  });
}

export function useMyNFTDrops() {
  return useQuery({
    queryKey: ["nft-drops", "mine"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("music_nft_drops")
        .select("*")
        .eq("owner_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as NFTDrop[];
    },
  });
}

export function useDropEditions(dropId: string | undefined) {
  return useQuery({
    queryKey: ["nft-editions", dropId],
    enabled: !!dropId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_nft_editions")
        .select("*")
        .eq("drop_id", dropId!)
        .order("edition_number", { ascending: true });
      if (error) throw error;
      return (data || []) as NFTEdition[];
    },
  });
}

export function useCreateNFTDrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<NFTDrop>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in required");
      const { data, error } = await supabase
        .from("music_nft_drops")
        .insert({
          owner_id: auth.user.id,
          title: input.title || "Untitled Drop",
          description: input.description ?? null,
          artwork_url: input.artwork_url ?? null,
          edition_size: input.edition_size ?? 100,
          price_cents: input.price_cents ?? 0,
          currency: input.currency ?? "usd",
          chain: input.chain ?? "base",
          status: input.status ?? "draft",
          track_id: input.track_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as NFTDrop;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nft-drops"] });
      toast.success("Drop created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMintEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ drop, walletAddress }: { drop: NFTDrop; walletAddress?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in required");
      const nextEdition = drop.minted_count + 1;
      if (nextEdition > drop.edition_size) throw new Error("Sold out");
      const { data, error } = await supabase
        .from("music_nft_editions")
        .insert({
          drop_id: drop.id,
          edition_number: nextEdition,
          owner_user_id: auth.user.id,
          wallet_address: walletAddress ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from("music_nft_drops")
        .update({
          minted_count: nextEdition,
          status: nextEdition >= drop.edition_size ? "sold_out" : drop.status,
        })
        .eq("id", drop.id);
      return data as NFTEdition;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nft-drops"] });
      qc.invalidateQueries({ queryKey: ["nft-editions"] });
      toast.success("Edition minted!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
