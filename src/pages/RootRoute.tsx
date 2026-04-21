import { lazy, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";

const Home = lazy(() => import("./Home"));
const Landing = lazy(() => import("./Landing"));

const Loader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
