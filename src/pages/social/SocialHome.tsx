import StoriesRow from "@/components/social/StoriesRow";
import GoingOutWeekCard from "@/components/social/GoingOutWeekCard";
import SocialFeed from "@/components/social/SocialFeed";
import SEOHead from "@/components/SEOHead";

export default function SocialHome() {
  return (
    <>
      <SEOHead title="Social — UPLY" description="Your social scene on UPLY" />
      <div className="pb-20">
        <StoriesRow />
        <GoingOutWeekCard />
        <SocialFeed />
      </div>
    </>
  );
}
