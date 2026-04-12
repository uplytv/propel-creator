import { Outlet } from "react-router-dom";

export default function SocialLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
