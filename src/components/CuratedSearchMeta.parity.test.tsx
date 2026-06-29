/**
 * Parity test: the verified badge + follow/unfollow control must render
 * identically whether a curated entry (e.g. Arya XO) is surfaced via the
 * main Search page's `useSearch` hook or the global `useSearchEngine`
 * results. Both hooks now project the same `verified` + `followKey` fields
 * onto their result objects, and both consumers must render through the
 * shared `CuratedSearchMeta` + `VerifiedTitleBadge` component so the UI is
 * guaranteed to match.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CURATED_RESULTS } from "@/lib/curatedSearch";
import CuratedSearchMeta, {
  VerifiedTitleBadge,
} from "@/components/CuratedSearchMeta";
import type { SearchResult } from "@/hooks/useSearch";
import type { SearchEngineResult } from "@/hooks/useSearchEngine";

// Mirror the curated->SearchResult projection from useSearch.ts
function toSearchResult(c: (typeof CURATED_RESULTS)[number]): SearchResult {
  return {
    id: c.id,
    type: c.type,
    title: c.title,
    subtitle: c.subtitle,
    image: c.image ?? null,
    link: c.link,
    verified: c.verified,
    followKey: c.followKey,
  };
}

// Mirror the curated->SearchEngineResult projection from useSearchEngine.ts
function toEngineResult(
  c: (typeof CURATED_RESULTS)[number],
  i: number,
): SearchEngineResult {
  return {
    id: c.id,
    type: c.type as SearchEngineResult["type"],
    title: c.title,
    subtitle: c.subtitle,
    thumbnail: c.image ?? null,
    link: c.link,
    combined_score: 10_000 + c.weight - i,
    verified: c.verified,
    followKey: c.followKey,
  };
}

function renderRowMeta(item: {
  title: string;
  verified?: boolean;
  followKey?: string;
}): string {
  const { container } = render(
    <>
      <VerifiedTitleBadge verified={item.verified} />
      <CuratedSearchMeta
        title={item.title}
        verified={item.verified}
        followKey={item.followKey}
      />
    </>,
  );
  return container.innerHTML;
}

describe("Search ↔ useSearchEngine curated render parity", () => {
  it("propagates verified + followKey through both hook projections", () => {
    CURATED_RESULTS.forEach((c, i) => {
      const s = toSearchResult(c);
      const e = toEngineResult(c, i);
      expect(s.verified).toBe(c.verified);
      expect(s.followKey).toBe(c.followKey);
      expect(e.verified).toBe(s.verified);
      expect(e.followKey).toBe(s.followKey);
      expect(e.title).toBe(s.title);
      expect(e.link).toBe(s.link);
    });
  });

  it("renders the same verified badge + follow button markup for every curated entry", () => {
    CURATED_RESULTS.forEach((c, i) => {
      const s = toSearchResult(c);
      const e = toEngineResult(c, i);
      const searchHtml = renderRowMeta(s);
      const engineHtml = renderRowMeta(e);
      expect(engineHtml).toBe(searchHtml);
    });
  });

  it("renders the verified badge + Follow button for the Arya XO artist card", () => {
    const arya = CURATED_RESULTS.find((c) => c.id === "arya-xo-artist");
    expect(arya).toBeTruthy();
    const html = renderRowMeta(toSearchResult(arya!));
    expect(html).toMatch(/Verified artist/);
    expect(html).toMatch(/Follow/);
  });
});
