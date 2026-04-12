import { Outlet } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import SocialTopNav from "./SocialTopNav";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

export default function SocialLayout() {
  return (
    <AppLayout>
      <SocialTopNav />
      <RouteErrorBoundary section="Social">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </RouteErrorBoundary>
    </AppLayout>
  );
}
