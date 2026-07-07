import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { markPending, clearPending } from "@/lib/optimisticRegistry";

export function useProducts() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return query;
}

export function useCreateProduct() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (product: {
      name: string;
      description?: string;
      type: string;
      price: number;
      status?: string;
      image_url?: string;
      download_url?: string | null;
      download_file_name?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("products")
        .insert({
          ...product,
          user_id: user!.id,
          status: product.status || "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (product) => {
      if (!user?.id) return;
      const ownerKey = ["products", user.id];
      const shopKey = ["creator-shop-products", user.id];
      await Promise.all([
        qc.cancelQueries({ queryKey: ownerKey }),
        qc.cancelQueries({ queryKey: shopKey }),
      ]);
      const prevOwner = qc.getQueryData<any[]>(ownerKey);
      const prevShop = qc.getQueryData<any[]>(shopKey);
      const optimistic: any = {
        id: `optimistic-${Date.now()}`,
        user_id: user.id,
        status: product.status || "draft",
        sales: 0,
        created_at: new Date().toISOString(),
        ...product,
      };
      qc.setQueryData<any[]>(ownerKey, (old) => [optimistic, ...(old || [])]);
      if (optimistic.status === "active") {
        qc.setQueryData<any[]>(shopKey, (old) => [optimistic, ...(old || [])]);
      }
      return { prevOwner, prevShop, ownerKey, shopKey };
    },
    onError: (e: Error, _v, ctx: any) => {
      if (ctx?.ownerKey) qc.setQueryData(ctx.ownerKey, ctx.prevOwner);
      if (ctx?.shopKey) qc.setQueryData(ctx.shopKey, ctx.prevShop);
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success("Product created!");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      if (user?.id) qc.invalidateQueries({ queryKey: ["creator-shop-products", user.id] });
    },
  });
}

export function useUpdateProduct() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string;
      type?: string;
      price?: number;
      status?: string;
      image_url?: string | null;
      download_url?: string | null;
      download_file_name?: string | null;
      bump_product_id?: string | null;
    }) => {
      // Cast: bump_product_id ships in migration 20260707060000_coupons.sql;
      // regenerate types.ts after deploy and drop this cast.
      const { data, error } = await supabase
        .from("products")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      if (!user?.id) return;
      markPending("products", id);
      const ownerKey = ["products", user.id];
      const shopKey = ["creator-shop-products", user.id];
      await Promise.all([
        qc.cancelQueries({ queryKey: ownerKey }),
        qc.cancelQueries({ queryKey: shopKey }),
      ]);
      const prevOwner = qc.getQueryData<any[]>(ownerKey);
      const prevShop = qc.getQueryData<any[]>(shopKey);

      qc.setQueryData<any[]>(ownerKey, (old) =>
        (old || []).map((p) => (p.id === id ? { ...p, ...updates } : p))
      );

      // Public shop list only includes active products — add/remove on status flip.
      qc.setQueryData<any[]>(shopKey, (old) => {
        const list = old || [];
        const existing = list.find((p) => p.id === id);
        const ownerRow = (prevOwner || []).find((p) => p.id === id);
        const merged = { ...(ownerRow || {}), ...(existing || {}), ...updates, id };
        const nextStatus = updates.status ?? merged.status;
        if (nextStatus && nextStatus !== "active") {
          return list.filter((p) => p.id !== id);
        }
        if (existing) {
          return list.map((p) => (p.id === id ? { ...p, ...updates } : p));
        }
        if (nextStatus === "active") {
          return [merged, ...list];
        }
        return list;
      });
      return { prevOwner, prevShop, ownerKey, shopKey, id };
    },
    onError: (e: Error, _v, ctx: any) => {
      if (ctx?.ownerKey) qc.setQueryData(ctx.ownerKey, ctx.prevOwner);
      if (ctx?.shopKey) qc.setQueryData(ctx.shopKey, ctx.prevShop);
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success("Product updated!");
    },
    onSettled: (_d, _e, vars: any) => {
      if (vars?.id) clearPending("products", vars.id);
      qc.invalidateQueries({ queryKey: ["products"] });
      if (user?.id) qc.invalidateQueries({ queryKey: ["creator-shop-products", user.id] });
    },
  });
}

export function useDeleteProduct() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      if (!user?.id) return;
      markPending("products", id);
      const ownerKey = ["products", user.id];
      const shopKey = ["creator-shop-products", user.id];
      await Promise.all([
        qc.cancelQueries({ queryKey: ownerKey }),
        qc.cancelQueries({ queryKey: shopKey }),
      ]);
      const prevOwner = qc.getQueryData<any[]>(ownerKey);
      const prevShop = qc.getQueryData<any[]>(shopKey);
      qc.setQueryData<any[]>(ownerKey, (old) => (old || []).filter((p) => p.id !== id));
      qc.setQueryData<any[]>(shopKey, (old) => (old || []).filter((p) => p.id !== id));
      return { prevOwner, prevShop, ownerKey, shopKey };
    },
    onError: (e: Error, _v, ctx: any) => {
      if (ctx?.ownerKey) qc.setQueryData(ctx.ownerKey, ctx.prevOwner);
      if (ctx?.shopKey) qc.setQueryData(ctx.shopKey, ctx.prevShop);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Product deleted"),
    onSettled: (_d, _e, id: any) => {
      if (typeof id === "string") clearPending("products", id);
      qc.invalidateQueries({ queryKey: ["products"] });
      if (user?.id) qc.invalidateQueries({ queryKey: ["creator-shop-products", user.id] });
    },
  });
}
