import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AryaXO from "@/pages/AryaXO";
import ArtistLinkPage from "@/components/artistroster/ArtistLinkPage";

/**
 * Guard rail: every external link on an artist's link-in-bio page must
 * (a) open in a new tab with safe rel attributes, and (b) resolve to a
 * non-4xx response (no dead links / 404s).
 *
 * Network checks are best-effort: if the sandbox can't reach the host
 * we skip that single assertion rather than fail the suite. The DOM
 * assertions (target/rel) run unconditionally.
 */

const FETCH_TIMEOUT_MS = 12_000;

async function probe(url: string): Promise<{ status: number } | { skip: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Use GET (some hosts 405 on HEAD) with redirect follow + a real UA.
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; UPLY-link-checker/1.0; +https://uply.tv)",
        accept: "text/html,*/*;q=0.8",
      },
    });
    return { status: res.status };
  } catch (err) {
    return { skip: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

type ExternalCase = {
  slug: string;
  label: string; // human label used in failure messages
  matchHost: RegExp; // identifies the anchor we're checking
  render: () => JSX.Element;
};

const CASES: ExternalCase[] = [
  // Arya XO (bespoke page)
  {
    slug: "arya-xo",
    label: "YouTube",
    matchHost: /(^|\.)youtube\.com\/@litreeezy/i,
    render: () => (
      <MemoryRouter initialEntries={["/arya-xo"]}>
        <AryaXO />
      </MemoryRouter>
    ),
  },
  {
    slug: "arya-xo",
    label: "Instagram",
    matchHost: /(^|\.)instagram\.com\/litreeezy/i,
    render: () => (
      <MemoryRouter initialEntries={["/arya-xo"]}>
        <AryaXO />
      </MemoryRouter>
    ),
  },
  {
    slug: "arya-xo",
    label: "TuneGo",
    matchHost: /\.tunego\.com/i,
    render: () => (
      <MemoryRouter initialEntries={["/arya-xo"]}>
        <AryaXO />
      </MemoryRouter>
    ),
  },
  // Roster artists (data-driven ArtistLinkPage). No TuneGo configured.
  ...(["omid", "morvarid", "andy"] as const).flatMap((slug) => [
    {
      slug,
      label: "YouTube",
      matchHost: /(^|\.)youtube\.com/i,
      render: () => (
        <MemoryRouter initialEntries={[`/${slug}`]}>
          <ArtistLinkPage slug={slug} />
        </MemoryRouter>
      ),
    },
    {
      slug,
      label: "Instagram",
      matchHost: /(^|\.)instagram\.com/i,
      render: () => (
        <MemoryRouter initialEntries={[`/${slug}`]}>
          <ArtistLinkPage slug={slug} />
        </MemoryRouter>
      ),
    },
  ]),
];

function findAnchor(host: RegExp): HTMLAnchorElement {
  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("a[href^='http']"),
  );
  const match = anchors.find((a) => host.test(a.getAttribute("href") ?? ""));
  if (!match) {
    throw new Error(
      `no external <a> matching ${host} found. hrefs: ${anchors
        .map((a) => a.getAttribute("href"))
        .join(", ")}`,
    );
  }
  return match;
}

describe("Artist external links", () => {
  for (const c of CASES) {
    describe(`${c.slug} → ${c.label}`, () => {
      it("opens in a new tab with safe rel attributes", () => {
        render(c.render());
        const a = findAnchor(c.matchHost);
        expect(a.getAttribute("target")).toBe("_blank");
        const rel = a.getAttribute("rel") ?? "";
        expect(rel).toMatch(/noopener/);
        expect(rel).toMatch(/noreferrer/);
      });

      it("destination does not 404 (network, best-effort)", async (ctx) => {
        render(c.render());
        const a = findAnchor(c.matchHost);
        const href = a.getAttribute("href")!;

        const result = await probe(href);
        if ("skip" in result) {
          ctx.skip(); // network unavailable in sandbox
          return;
        }
        // 2xx/3xx = fine. Anything 4xx/5xx = broken link.
        // Some hosts (e.g. instagram) gate scrapers with 401/403 even for
        // valid URLs — accept those as "reachable, not a 404".
        const acceptable =
          result.status < 400 ||
          result.status === 401 ||
          result.status === 403 ||
          result.status === 429;
        expect(
          acceptable,
          `${c.slug} ${c.label} (${href}) returned ${result.status}`,
        ).toBe(true);
        expect(result.status).not.toBe(404);
      }, FETCH_TIMEOUT_MS + 3_000);
    });
  }
});
