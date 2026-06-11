import { useState } from "react";
import { Link } from "react-router-dom";
import { useGroupBlends } from "../hooks/useGroupBlends";
import { Plus, Users } from "lucide-react";

export default function GroupBlendsPage() {
  const { data: blends = [], create } = useGroupBlends();
  const [name, setName] = useState("");

  return (
    <div className="px-4 py-4 mobile-safe-content space-y-4">
      <header>
        <h1 className="text-white font-black text-2xl">Group Blends</h1>
        <p className="text-white/50 text-sm mt-1">Mix everyone's taste into one playlist.</p>
      </header>

      <div className="rounded-xl bg-white/5 p-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday Night Mix"
          className="flex-1 bg-white/5 text-white rounded-lg px-3 py-2.5 border border-white/10 placeholder:text-white/30"
          style={{ fontSize: 16, minHeight: 44 }}
        />
        <button
          onClick={() => name.trim() && create.mutate(name.trim(), { onSuccess: () => setName("") })}
          className="rounded-lg bg-[#3D7CFF] text-black font-bold px-4 flex items-center gap-2"
          style={{ minHeight: 44 }}
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {blends.length === 0 ? (
        <div className="rounded-xl bg-white/5 p-8 text-center">
          <Users className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <p className="text-white/50 text-sm">No blends yet. Create one and invite friends.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {blends.map((b) => (
            <li key={b.id}>
              <Link
                to={`/music/blend/group/${b.id}`}
                className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
                style={{ minHeight: 60 }}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#3D7CFF] to-[#00E5FF] flex items-center justify-center">
                  <Users className="w-5 h-5 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{b.name}</p>
                  <p className="text-white/40 text-xs">Updated {new Date(b.updated_at).toLocaleDateString()}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
