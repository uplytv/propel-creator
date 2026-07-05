import { useLocation } from "react-router-dom";
import ArtistSiteTemplate from "@/components/artistroster/ArtistSiteTemplate";

/** Renders the shared editorial site for any roster artist at /:slug-site. */
export default function ArtistSiteRoute() {
  const { pathname } = useLocation();
  const slug = pathname.split("/")[1]?.replace(/-site$/, "") ?? "";
  return <ArtistSiteTemplate slug={slug} />;
}
