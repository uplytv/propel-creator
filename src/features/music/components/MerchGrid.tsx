import { useArtistMerch } from "../hooks/useArtistMerch";
import { ShoppingBag } from "lucide-react";

interface Props {
  artistId?: string;
}

export default function MerchGrid({ artistId }: Props) {
  const { data, isLoading } = useArtistMerch(artistId);

  if (isLoading) return <div className="h-32 rounded-xl bg-white/5 animate-pulse" />;
  if (!data?.length) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
        <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-white/40" />
        <p className="text-white/50 text-sm">No merch available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {data.map((item) => {
        const Tag = item.external_url ? "a" : "div";
        const props: any = item.external_url
          ? { href: item.external_url, target: "_blank", rel: "noopener noreferrer" }
          : {};
        return (
          <Tag
            key={item.id}
            {...props}
            className="block rounded-xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div
              className="aspect-square w-full bg-white/5"
              style={
                item.image_url
                  ? { backgroundImage: `url(${item.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : undefined
              }
            />
            <div className="p-2.5">
              <p className="text-white text-sm font-semibold truncate">{item.name}</p>
              <p className="text-white/60 text-xs mt-0.5">
                {item.currency} {(item.price_cents / 100).toFixed(2)}
              </p>
            </div>
          </Tag>
        );
      })}
    </div>
  );
}
