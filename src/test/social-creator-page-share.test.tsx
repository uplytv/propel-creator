import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// jsdom stubs
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

vi.mock("@/lib/shareUrls", () => ({
  buildProfileShareUrl: vi.fn(),
  buildTrackShareUrl: vi.fn(),
  buildStreamShareUrl: vi.fn(),
}));

vi.mock("@/lib/posthog", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/features/music/components/ArtistPage/usePageMeta", () => ({
  usePageMeta: vi.fn(),
}));

vi.mock("@/lib/profileSlug", () => ({
  normalizeProfileSlugInput: (v?: string) => (v || "").replace(/^@+/, "").trim(),
  getProfileHandleCandidates: (v?: string) => [v || ""],
}));

vi.mock("@/lib/optimisticRegistry", () => ({
  shouldAcceptRealtime: () => true,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useFollows", () => ({
  useFollows: () => ({ isFollowing: () => false, follow: vi.fn(), unfollow: vi.fn() }),
}));

vi.mock("@/hooks/useInviteCodes", () => ({
  useInviteCodes: () => ({ data: { remaining: 0 } }),
}));

// Lazy-loaded chunk inside the page — no-op it so the test stays synchronous
vi.mock("@/features/music/components/ArtistPage/ArtistPageContent", () => ({
  default: () => null,
}));

// Child components that fetch their own data — no-op to keep test focused
vi.mock("@/components/creatorprofile/social/CoverHeader", () => ({
  default: () => null,
}));

import SocialCreatorPage from "@/components/creatorprofile/social/SocialCreatorPage";
import { buildProfileShareUrl } from "@/lib/shareUrls";
import { trackEvent } from "@/lib/posthog";
import { supabase } from "@/integrations/supabase/client";

const mockBuildProfileShareUrl = vi.mocked(buildProfileShareUrl);
const mockTrackEvent = vi.mocked(trackEvent);
const mockSupabase = supabase as unknown as any;

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

describe("SocialCreatorPage share integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildProfileShareUrl.mockReturnValue(
      "https://uply.tv/@testcreator?utm_source=profile&utm_medium=web_share&utm_campaign=testcreator"
    );

    // Supabase stubs
    mockSupabase.from.mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      };

      if (table === "artist_profiles") {
        // First call: .eq("vanity_slug", candidate).maybeSingle() → null
        chain.maybeSingle.mockResolvedValueOnce({ data: null });
        // Second call: .eq("user_id", ...).maybeSingle() → artist profile
        chain.maybeSingle.mockResolvedValueOnce({
          data: {
            user_id: "user-123",
            vanity_slug: "testcreator",
            is_verified: true,
            seo_title: null,
            seo_description: null,
            seo_og_image: null,
            tagline: null,
            artist_bio: null,
            social_links: null,
            cta_label: null,
            cta_url: null,
          },
        });
      }

      if (table === "follows") {
        chain.select.mockImplementation((_cols: any, opts: any) => {
          if (opts?.count === "exact") {
            return { ...chain, count: 0 };
          }
          return chain;
        });
        chain.maybeSingle = vi.fn().mockResolvedValue({ count: 0 });
      }

      if (table === "creator_works") {
        chain.maybeSingle = vi.fn().mockResolvedValue({ count: 0 });
      }

      if (table === "subscription_tiers") {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null });
      }

      if (table === "mux_live_streams_public") {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null });
      }

      if (table === "classroom_lessons") {
        chain.select.mockImplementation((_cols: any, opts: any) => {
          if (opts?.count === "exact") {
            return { ...chain, count: 0 };
          }
          return chain;
        });
        chain.maybeSingle = vi.fn().mockResolvedValue({ count: 0 });
      }

      return chain;
    });

    mockSupabase.rpc.mockImplementation((name: string, params: any) => {
      if (name === "get_public_profile_by_username") {
        return {
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "profile-1",
              user_id: "user-123",
              username: params._username,
              display_name: "Test Creator",
              avatar_url: null,
              cover_image_url: null,
              bio: "Just a test creator.",
              creator_type: null,
              creator_layout: null,
              members: 0,
            },
          }),
        };
      }
      return { maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
    });

    // Native share & clipboard stubs
    Object.assign(navigator, {
      share: vi.fn().mockResolvedValue(undefined),
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderPage() {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/testcreator"]}>
          <Routes>
            <Route path=":slug" element={<SocialCreatorPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it("calls buildProfileShareUrl with the canonical slug when the share button is clicked", async () => {
    renderPage();

    // Wait for the profile to load so the share button appears
    const shareBtn = await screen.findByRole("button", { name: /share profile/i });
    expect(shareBtn).toBeInTheDocument();

    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(mockBuildProfileShareUrl).toHaveBeenCalledTimes(1);
    });

    // Should be called with the canonical slug and "web_share" medium
    expect(mockBuildProfileShareUrl).toHaveBeenCalledWith("testcreator", "web_share");
  });

  it("triggers navigator.share with the expected title and URL when the share button is clicked", async () => {
    renderPage();

    const shareBtn = await screen.findByRole("button", { name: /share profile/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(navigator.share).toHaveBeenCalledTimes(1);
    });

    expect(navigator.share).toHaveBeenCalledWith({
      title: "Test Creator (@testcreator) on UPLY",
      url: "https://uply.tv/@testcreator?utm_source=profile&utm_medium=web_share&utm_campaign=testcreator",
    });
  });

  it("falls back to clipboard when navigator.share is unavailable", async () => {
    (navigator as any).share = undefined;
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard.writeText = writeTextSpy;

    renderPage();

    const shareBtn = await screen.findByRole("button", { name: /share profile/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(mockBuildProfileShareUrl).toHaveBeenCalledTimes(1);
    });
    expect(writeTextSpy).toHaveBeenCalledWith(
      "https://uply.tv/@testcreator?utm_source=profile&utm_medium=web_share&utm_campaign=testcreator"
    );
  });

  it("exposes the correct accessible name on the share button", async () => {
    renderPage();

    const shareBtn = await screen.findByRole("button", { name: /share profile/i });

    expect(shareBtn).toHaveAccessibleName("Share profile");
    expect(shareBtn).toHaveAttribute("aria-label", "Share profile");
  });

  it("keeps the share button keyboard accessible as a native button", async () => {
    renderPage();

    const shareBtn = await screen.findByRole("button", { name: /share profile/i });

    // Native <button> is focusable by default and responds to Enter/Space
    expect(shareBtn.tagName.toLowerCase()).toBe("button");
    expect(shareBtn).toHaveAttribute("type", "button");
    shareBtn.focus();
    expect(shareBtn).toHaveFocus();
  });

  it("fires an analytics event with medium and slug when the share button is clicked via native share", async () => {
    renderPage();

    const shareBtn = await screen.findByRole("button", { name: /share profile/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith("profile_shared", {
      medium: "web_share",
      slug: "testcreator",
      method: "native_share",
    });
  });

  it("fires an analytics event with medium and slug when falling back to clipboard", async () => {
    (navigator as any).share = undefined;

    renderPage();

    const shareBtn = await screen.findByRole("button", { name: /share profile/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith("profile_shared", {
      medium: "web_share",
      slug: "testcreator",
      method: "clipboard",
    });
  });

  it.each([
    { slug: "dj-marshmello", displayName: "DJ Marshmello" },
    { slug: "charli-xcx", displayName: "Charli XCX" },
    { slug: "someone-else-123", displayName: "Someone Else" },
  ])("fires analytics with correct slug for $slug", async ({ slug, displayName }) => {
    // Re-configure mocks for this specific slug
    mockBuildProfileShareUrl.mockReturnValue(
      `https://uply.tv/@${slug}?utm_source=profile&utm_medium=web_share&utm_campaign=${slug}`
    );

    // Update the RPC mock to return the parameterized slug
    mockSupabase.rpc.mockImplementation((name: string, params: any) => {
      if (name === "get_public_profile_by_username") {
        return {
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "profile-1",
              user_id: "user-123",
              username: params._username,
              display_name: displayName,
              avatar_url: null,
              cover_image_url: null,
              bio: "Just a test creator.",
              creator_type: null,
              creator_layout: null,
              members: 0,
            },
          }),
        };
      }
      return { maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/${slug}`]}>
          <Routes>
            <Route path=":slug" element={<SocialCreatorPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const shareBtn = await screen.findByRole("button", { name: /share profile/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

      expect(mockTrackEvent).toHaveBeenCalledWith("profile_shared", {
        medium: "web_share",
        slug,
        method: "native_share",
      });
    });

  it("only fires one analytics event when the share button is clicked multiple times rapidly", async () => {
    renderPage();

    const shareBtn = await screen.findByRole("button", { name: /share profile/i });

    // Click three times in rapid succession
    fireEvent.click(shareBtn);
    fireEvent.click(shareBtn);
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    // Ensure it was the correct event
    expect(mockTrackEvent).toHaveBeenCalledWith("profile_shared", {
      medium: "web_share",
      slug: "testcreator",
      method: "native_share",
    });
  });

  it("does not fire analytics or set state after unmount during an in-flight share", async () => {
    let resolveShare: () => void;
    const sharePromise = new Promise<void>((resolve) => {
      resolveShare = resolve;
    });
    (navigator as any).share = vi.fn().mockReturnValue(sharePromise);

    const { unmount } = renderPage();

    const shareBtn = await screen.findByRole("button", { name: /share profile/i });
    fireEvent.click(shareBtn);

    // Unmount while share is in-flight
    unmount();

    // Resolve the share promise after unmount
    resolveShare!();

    // Give any microtasks a chance to run
    await new Promise((r) => setTimeout(r, 0));

    // trackEvent should never have been called because the component unmounted
    // before the share promise resolved
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
