import { describe, it, expect, vi } from "vitest";
import {
  buildShareUrl,
  buildProfileShareUrl,
  buildTrackShareUrl,
  buildStreamShareUrl,
} from "@/lib/shareUrls";

vi.mock("@/lib/siteUrl", () => ({
  getSiteUrl: () => "https://uply.tv",
}));

describe("buildShareUrl", () => {
  it("uses the canonical production URL, never a preview origin", () => {
    const url = buildShareUrl("/@creator", { source: "profile" });
    expect(url).toMatch(/^https:\/\/uply\.tv\//);
    expect(url).not.toContain("localhost");
    expect(url).not.toContain("lovable.app");
  });

  it("appends all UTM parameters when provided", () => {
    const url = buildShareUrl("/music/track/123", {
      source: "track",
      medium: "social",
      campaign: "summer-drop",
      content: "share-sheet",
      term: "electronic",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_source")).toBe("track");
    expect(parsed.searchParams.get("utm_medium")).toBe("social");
    expect(parsed.searchParams.get("utm_campaign")).toBe("summer-drop");
    expect(parsed.searchParams.get("utm_content")).toBe("share-sheet");
    expect(parsed.searchParams.get("utm_term")).toBe("electronic");
  });

  it("omits UTM keys that are not provided", () => {
    const url = buildShareUrl("/stream/abc", { source: "stream" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_source")).toBe("stream");
    expect(parsed.searchParams.has("utm_medium")).toBe(false);
    expect(parsed.searchParams.has("utm_campaign")).toBe(false);
    expect(parsed.searchParams.has("utm_content")).toBe(false);
    expect(parsed.searchParams.has("utm_term")).toBe(false);
  });

  it("adds a leading slash to the path if missing", () => {
    const url = buildShareUrl("join/code", { source: "referral" });
    expect(url).toContain("/join/code");
  });

  it("preserves the original path when it already starts with a slash", () => {
    const url = buildShareUrl("/join/code", { source: "referral" });
    expect(url).toContain("/join/code");
    expect(url).not.toContain("//join");
  });

  it("encodes UTM values that need URI encoding", () => {
    const url = buildShareUrl("/@creator", {
      source: "profile",
      campaign: "hello world & more",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_campaign")).toBe("hello world & more");
  });
});

describe("convenience helpers", () => {
  it("buildProfileShareUrl generates a profile share with default medium", () => {
    const url = buildProfileShareUrl("creator");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/@creator");
    expect(parsed.searchParams.get("utm_source")).toBe("profile");
    expect(parsed.searchParams.get("utm_medium")).toBe("social");
    expect(parsed.searchParams.get("utm_campaign")).toBe("creator");
  });

  it("buildProfileShareUrl accepts an override medium", () => {
    const url = buildProfileShareUrl("creator", "clipboard");
    expect(new URL(url).searchParams.get("utm_medium")).toBe("clipboard");
  });

  it("buildTrackShareUrl generates a track share with default medium", () => {
    const url = buildTrackShareUrl("track-456");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/music/track/track-456");
    expect(parsed.searchParams.get("utm_source")).toBe("track");
    expect(parsed.searchParams.get("utm_medium")).toBe("social");
    expect(parsed.searchParams.get("utm_campaign")).toBe("track-456");
  });

  it("buildTrackShareUrl accepts an override medium", () => {
    const url = buildTrackShareUrl("track-456", "web_share");
    expect(new URL(url).searchParams.get("utm_medium")).toBe("web_share");
  });

  it("buildStreamShareUrl generates a stream share with default medium", () => {
    const url = buildStreamShareUrl("stream-789");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/stream/stream-789");
    expect(parsed.searchParams.get("utm_source")).toBe("stream");
    expect(parsed.searchParams.get("utm_medium")).toBe("social");
    expect(parsed.searchParams.get("utm_campaign")).toBe("stream-789");
  });

  it("buildStreamShareUrl accepts an override medium", () => {
    const url = buildStreamShareUrl("stream-789", "copy_link");
    expect(new URL(url).searchParams.get("utm_medium")).toBe("copy_link");
  });
});
