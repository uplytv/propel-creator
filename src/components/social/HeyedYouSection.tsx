import { useHeys } from "@/hooks/useHeys";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function HeyedYouSection() {
  const { receivedHeys, isLoading } = useHeys();

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (receivedHeys.length === 0) {
    return (
      <div className="px-4 py-4">
        <h2 className="text-base font-semibold text-white mb-2">Heyed You</h2>
        <p className="text-sm text-white/40">No one has Heyed you yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <h2 className="text-base font-semibold text-white mb-3">Heyed You 👋</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {receivedHeys.map((hey: any) => {
          const sender = hey.sender;
          const revealed = hey.is_mutual || hey.hey_type === "super";
          return (
            <div key={hey.id} className="flex flex-col items-center gap-1 flex-shrink-0">
              <Avatar className="w-14 h-14" style={{ filter: revealed ? "none" : "blur(8px)" }}>
                <AvatarImage src={sender?.avatar_url} />
                <AvatarFallback className="bg-white/10 text-white text-xs">?</AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-white/50">
                {revealed ? sender?.display_name?.slice(0, 8) : "???"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
