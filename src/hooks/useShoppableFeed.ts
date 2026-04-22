import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShoppableItem {
  content_type: "clip" | "short" | "video" | "stream";
  content_id: string;
  title: string;
  thumbnail_url: string | null;
  playback_id: string | null;
  creator_id: string;
  product_id: string;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
  creator?: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    username: string | null;
  };
}

const PAGE_SIZE = 12;

async function fetchShoppablePage(pageParam: number): Promise<ShoppableItem[]> {
  const offset = pageParam * PAGE_SIZE;

  // Pull from clips, shorts, videos in parallel
  const [clipsRes, shortsRes, videosRes] = await Promise.all([
    supabase
      .from("clips")
      .select("id, caption, clip_playback_id, creator_id, featured_product_id")
      .not("featured_product_id", "is", null)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from("shorts")
      .select("id, caption, playback_id, creator_id, featured_product_id")
      .not("featured_product_id", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from("videos")
      .select("id, title, thumbnail_url, creator_id, featured_product_id")
      .not("featured_product_id", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
  ]);

  const items: ShoppableItem[] = [
    ...((clipsRes.data as any[]) || []).map((c) => ({
      content_type: "clip" as const,
      content_id: c.id,
      title: c.caption || "Clip",
      thumbnail_url: null,
      playback_id: c.clip_playback_id,
      creator_id: c.creator_id,
      product_id: c.featured_product_id,
    })),
    ...((shortsRes.data as any[]) || []).map((s) => ({
      content_type: "short" as const,
      content_id: s.id,
      title: s.caption || "Short",
      thumbnail_url: null,
      playback_id: s.playback_id,
      creator_id: s.creator_id,
      product_id: s.featured_product_id,
    })),
    ...((videosRes.data as any[]) || []).map((v) => ({
      content_type: "video" as const,
      content_id: v.id,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      playback_id: null,
      creator_id: v.creator_id,
      product_id: v.featured_product_id,
    })),
  ];

  if (items.length === 0) return [];

  // Enrich
  const productIds = [...new Set(items.map((i) => i.product_id))];
  const creatorIds = [...new Set(items.map((i) => i.creator_id))];

  const [products, creators] = await Promise.all([
    supabase.from("products").select("id, name, price, image_url").in("id", productIds),
    supabase.from("profiles_public").select("user_id, display_name, avatar_url, username").in("user_id", creatorIds),
  ]);

  const productMap = new Map((products.data as any[])?.map((p: any) => [p.id, p]) ?? []);
  const creatorMap = new Map((creators.data as any[])?.map((c: any) => [c.user_id, c]) ?? []);

  // Shuffle slightly for variety
  return items
    .map((i) => ({
      ...i,
      product: productMap.get(i.product_id),
      creator: creatorMap.get(i.creator_id),
    }))
    .filter((i) => i.product); // skip if product was deleted
}

export function useShoppableFeed() {
  return useInfiniteQuery({
    queryKey: ["shoppable-feed"],
    queryFn: ({ pageParam = 0 }) => fetchShoppablePage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, all) => (lastPage.length >= PAGE_SIZE ? all.length : undefined),
    staleTime: 60_000,
  });
}
