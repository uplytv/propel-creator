import StoriesRow from "@/components/social/StoriesRow";
import SocialFeed from "@/components/social/SocialFeed";
import SEOHead from "@/components/SEOHead";

export default function SocialFriends() {
  return (
    <>
      <SEOHead title="Friends — UPLY" description="See what your friends are up to" />
      <div className="pb-20">
        <StoriesRow filterFriends />
        <SocialFeed friendsOnly />
      </div>
    </>
  );
}
