import { lazy, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";

const Home = lazy(() => import("./Home"));
const Landing = lazy(() => import("./Landing"));

const Loader = () => (
  <div className="min-h-screen bg-[#0A0A0A] text-white animate-pulse">
    {/* Navbar skeleton */}
    <div className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-md bg-white/10" />
        <div className="h-4 w-20 rounded bg-white/10" />
      </div>
      <div className="hidden md:flex items-center gap-6">
        <div className="h-3 w-12 rounded bg-white/10" />
        <div className="h-3 w-12 rounded bg-white/10" />
        <div className="h-3 w-12 rounded bg-white/10" />
      </div>
      <div className="h-9 w-9 rounded-full bg-white/10" />
    </div>

    {/* Hero skeleton */}
    <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end px-6 lg:px-12 pb-16 gap-4 max-w-2xl">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="h-10 w-3/4 rounded bg-white/10" />
        <div className="h-10 w-1/2 rounded bg-white/10" />
        <div className="h-4 w-full max-w-md rounded bg-white/10" />
        <div className="flex gap-3 pt-2">
          <div className="h-11 w-32 rounded-full bg-white/10" />
          <div className="h-11 w-28 rounded-full bg-white/10" />
        </div>
      </div>
    </div>

    {/* Row skeletons */}
    <div className="relative z-10 -mt-16 flex flex-col gap-14 pb-20">
      {[0, 1, 2].map((row) => (
        <div key={row} className="px-6 lg:px-12">
          <div className="mb-4 space-y-2">
            <div className="h-5 w-40 rounded bg-white/10" />
            <div className="h-3 w-64 rounded bg-white/10" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((tile) => (
              <div
                key={tile}
                className="h-44 w-72 shrink-0 rounded-xl bg-white/[0.06]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;

  return (
    <Suspense fallback={<Loader />}>
      {user ? <Home /> : <Landing />}
    </Suspense>
  );
}
