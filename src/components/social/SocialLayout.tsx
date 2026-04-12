import { Outlet } from "react-router-dom";
import SocialTopNav from "./SocialTopNav";

export default function SocialLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SocialTopNav />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
