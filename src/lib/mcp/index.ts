import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listProducts from "./tools/list-products";
import listPosts from "./tools/list-posts";
import createPost from "./tools/create-post";
import createBusinessProfile from "./tools/create-business-profile";
import updateBusinessProfile from "./tools/update-business-profile";
import createBusinessPost from "./tools/create-business-post";
import listBusinessLeads from "./tools/list-business-leads";
import getBusinessAnalytics from "./tools/get-business-analytics";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "uply-mcp",
  title: "UPLY",
  version: "0.2.0",
  instructions:
    "Tools for a UPLY creator's own account. `whoami`, `list_my_products`, `list_my_posts`, `create_post` act as the signed-in creator. " +
    "Admin-only business tenant tools: `create_business_profile`, `update_business_profile`, `create_business_post`, `list_business_leads`, `get_business_analytics`. " +
    "All tools authorize via Supabase RLS and public.has_role.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    listProducts,
    listPosts,
    createPost,
    createBusinessProfile,
    updateBusinessProfile,
    createBusinessPost,
    listBusinessLeads,
    getBusinessAnalytics,
  ],
});

