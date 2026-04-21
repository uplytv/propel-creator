import { lazy, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import PageLoader from "@/components/PageLoader";

const Home = lazy(() => import("./Home"));
const Landing = lazy(() => import("./Landing"));

export default function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      {user ? <Home /> : <Landing />}
    </Suspense>
  );
}
