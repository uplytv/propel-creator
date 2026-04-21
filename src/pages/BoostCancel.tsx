import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BoostCancel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-4">
        <XCircle className="w-16 h-16 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Boost canceled</h1>
        <p className="text-muted-foreground">No charge was made. You can boost your content anytime.</p>
        <Button onClick={() => navigate(-1)}>Go back</Button>
      </div>
    </div>
  );
}
