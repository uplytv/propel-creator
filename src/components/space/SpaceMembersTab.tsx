import { useState } from "react";
import { Search } from "lucide-react";
import { useCommunityMembers } from "@/hooks/useCommunityMembers";
import { formatDistanceToNow } from "date-fns";

interface Props {
  creatorId: string;
}

export default function SpaceMembersTab({ creatorId }: Props) {
  const { data: members = [], isLoading } = useCommunityMembers(creatorId);
  const [search, setSearch] = useState("");

  const filtered = members.filter((m: any) =>
    (m.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 pt-4">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: "hsl(var(--background))", border: "1px solid #1e1e1e" }}>
        <Search className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-gray-500"
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
            <div
              key={member.id}
              className="p-4 rounded-lg text-center"
              style={{ background: "hsl(var(--background))", border: "1px solid #1e1e1e" }}
            >
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" loading="lazy" className="w-12 h-12 rounded-full mx-auto mb-2 object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold" style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}>
                  {(member.display_name || "M").charAt(0)}
                </div>
              )}
              <p className="text-sm font-semibold text-white truncate">{member.display_name}</p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
              </p>
              {member.user_id === creatorId && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--warning))", color: "hsl(var(--background))" }}>
                  Creator
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
