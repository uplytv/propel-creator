import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PendingApproval() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-heading font-bold">Your access is pending approval</h1>

        <p className="text-muted-foreground leading-relaxed">
          Thanks for joining UPLY. Our team will review and activate your account shortly.
          You'll receive an email once you're approved.
        </p>

        <div className="pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => supabase.auth.signOut()}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
