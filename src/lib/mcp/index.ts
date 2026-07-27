import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listProducts from "./tools/list-products";
import listPosts from "./tools/list-posts";
import createPost from "./tools/create-post";

// The OAuth issuer MUST be the direct Supabase host, built from the project ref.
// import.meta.env.VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time so
// this stays import-safe (no runtime env read at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "uply-mcp",
  title: "UPLY",
  version: "0.1.0",
  instructions:
    "Tools for a UPLY creator's own account. `whoami` returns the signed-in creator's profile. " +
    "`list_my_products` and `list_my_posts` read the creator's catalog and feed. " +
    "`create_post` publishes a new social post as the signed-in creator. " +
    "All tools act as the signed-in user via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listProducts, listPosts, createPost],
});
