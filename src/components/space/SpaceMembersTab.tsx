import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, UserPlus, UserCheck, FileText, CalendarDays, MessageCircle, Loader2 } from "lucide-react";
import { getOrCreateDmThread } from "@/lib/dm";
import { useCommunityMembers } from "@/hooks/useCommunityMembers";
import { useMemberCommunityProfile } from "@/hooks/useCommunityDepth";
import { useMemberPointTotals } from "@/hooks/useMemberLevels";
import MemberXPBadge from "@/components/space/MemberXPBadge";
import { useFollows } from "@/hooks/useFollows";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface Props {
  creatorId: string;
}

export default function SpaceMembersTab({ creatorId }: Props) {
  const { data: members = [], isLoading } = useCommunityMembers(creatorId);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const filtered = members.filter((m: any) =>
    (m.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  // Level badges: ONE member_points query for all visible members.
  const { data: memberTotals } = useMemberPointTotals(
    creatorId,
    filtered.map((m: any) => m.user_id as string)
  );

  return (
    <div className="px-4 pt-4">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
        <Search className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-lg animate-pulse" style={{ background: "hsl(var(--background))" }}>
              <div className="w-12 h-12 rounded-full mx-auto mb-2" style={{ background: "hsl(var(--card))" }} />
              <div className="h-3 w-20 mx-auto rounded" style={{ background: "hsl(var(--card))" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-lg" style={{ background: "hsl(var(--background))" }}>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            {members.length === 0 ? "No members yet. Be the first to join!" : "No members match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((member: any) => (
            <button
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="p-4 rounded-lg text-center transition-colors hover:border-primary/40"
              style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
            >
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" loading="lazy" className="w-12 h-12 rounded-full mx-auto mb-2 object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold" style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}>
                  {(member.display_name || "M").charAt(0)}
                </div>
              )}
              <p className="text-sm font-semibold text-foreground truncate flex items-center justify-center gap-1.5">
                <span className="truncate">{member.display_name}</span>
                <MemberXPBadge xp={memberTotals?.get(member.user_id) ?? 0} />
              </p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
              </p>
              {member.user_id === creatorId && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--warning))", color: "hsl(var(--background))" }}>
                  Creator
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Member profile sheet */}
      <MemberProfileSheet
        member={selectedMember}
        creatorId={creatorId}
        xp={selectedMember ? memberTotals?.get(selectedMember.user_id) ?? 0 : 0}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}

function MemberProfileSheet({ member, creatorId, xp, onClose }: { member: any; creatorId: string; xp: number; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { follow, unfollow, isFollowing } = useFollows();
  const { data, isLoading } = useMemberCommunityProfile(member?.user_id, creatorId);
  const [messageLoading, setMessageLoading] = useState(false);
  const profile = data?.profile as any;
  const postCount = data?.postCount ?? 0;

  const isSelf = !!user && !!member && user.id === member.user_id;
  const following = member ? isFollowing(member.user_id) : false;

  const handleMessage = async () => {
    if (!user || !member || messageLoading) return;
    setMessageLoading(true);
    try {
      const threadId = await getOrCreateDmThread(user.id, member.user_id);
      navigate(`/dm?c=${threadId}`);
    } catch {
      toast.error("Couldn't start this conversation");
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <Sheet open={!!member} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Member profile</SheetTitle>
        </SheetHeader>
        {member && (
          <div className="mt-4">
            {/* Identity */}
            <div className="flex items-center gap-3">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" loading="lazy" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-muted text-foreground">
                  {(member.display_name || "M").charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-base font-bold text-foreground truncate flex items-center gap-2">
                  <span className="truncate">{profile?.display_name || member.display_name}</span>
                  <MemberXPBadge xp={xp} size="md" />
                </p>
                {profile?.username && (
                  <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                )}
                {member.user_id === creatorId && (
                  <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    Creator
                  </span>
                )}
              </div>
            </div>

            {/* Bio */}
            {isLoading ? (
              <div className="mt-4 space-y-2 animate-pulse">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            ) : profile?.bio ? (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            ) : null}

            {/* Community stats */}
            <div className="mt-4 space-y-2 border-y border-border py-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                Joined {format(new Date(member.joined_at), "MMM d, yyyy")}
              </p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                {postCount} {postCount === 1 ? "post" : "posts"} in this community
              </p>
            </div>

            {/* Message + Follow */}
            {user && !isSelf && (
              <div className="mt-4 space-y-2">
                <Button
                  className="w-full font-semibold"
                  onClick={handleMessage}
                  disabled={messageLoading}
                >
                  {messageLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening…</>
                  ) : (
                    <><MessageCircle className="w-4 h-4 mr-2" /> Message</>
                  )}
                </Button>
                <Button
                  variant={following ? "outline" : "secondary"}
                  className="w-full font-semibold"
                  onClick={() => (following ? unfollow(member.user_id) : follow(member.user_id))}
                >
                  {following ? (
                    <><UserCheck className="w-4 h-4 mr-2" /> Following</>
                  ) : (
                    <><UserPlus className="w-4 h-4 mr-2" /> Follow</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
