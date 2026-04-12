import { Outlet } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

export default function SocialLayout() {
  return (
    <AppLayout>
      <RouteErrorBoundary section="Social">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </RouteErrorBoundary>
    </AppLayout>
  );
}
