import { useLocation } from "react-router-dom";
import TajHome from "./TajHome";
import TajClassroom from "./TajClassroom";
import TajJoin from "./TajJoin";

/** Canonical club experience at /taj, /taj-fencing, and /tajfencing. */
export default function TajSite() {
  const { pathname } = useLocation();
  const path = pathname.replace(/^\/(taj-fencing|tajfencing)/, "/taj");
  if (path.startsWith("/taj/join")) return <TajJoin />;
  if (path.startsWith("/taj/classroom")) return <TajClassroom />;
  return <TajHome />;
}
