import { Outlet } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import SocialTopNav from "./SocialTopNav";

export default function SocialLayout() {
  return (
    <AppLayout>
      <SocialTopNav />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </AppLayout>
  );
}
