import { useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createListeningParty } from "../hooks/useListeningParty";
import { toast } from "@/hooks/use-toast";

interface Props {
  className?: string;
}

export default function StartPartyButton({ className = "" }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (!user) {
      toast({ title: "Sign in to host a party" });
      return;
    }
    setLoading(true);
    try {
      const party = await createListeningParty(user.id);
      navigate(`/music/party/${party.share_code}`);
    } catch (e: any) {
      toast({ title: "Could not start party", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={start}
      disabled={loading}
      className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${className}`}
      style={{ background: "rgba(61, 124, 255,0.15)", color: "#3D7CFF", border: "1px solid rgba(61, 124, 255,0.4)" }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
      Listening Party
    </button>
  );
}
