import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AryaXO from "@/pages/AryaXO";
import ArtistLinkPage from "@/components/artistroster/ArtistLinkPage";

/**
 * Guard rail: every artist's "Official Site" button must point at an
 * in-app route (or absolute URL) that actually exists. Prevents the
 * regression where Arya XO's CTA pointed at a dead external URL and
 * roster artists silently 404'd.
 */

const APP_SOURCE = readFileSync(
  resolve(__dirname, "../App.tsx"),
  "utf8",
);

// Expected destination per artist + label of the "Official Site" CTA on
// their links page. Arya uses a bespoke link page, the rest share
// ArtistLinkPage driven from ARTIST_ROSTER.
const CASES: Array<{
  slug: string;
  label: RegExp;
  expectedHref: string;
  render: () => JSX.Element;
}> = [
  {
    slug: "arya-xo",
    label: /official site/i,
    expectedHref: "/arya-xo-site",
    render: () => (
      <MemoryRouter initialEntries={["/arya-xo"]}>
        <AryaXO />
      </MemoryRouter>
    ),
  },
  {
    slug: "omid",
    label: /visit the official site/i,
    expectedHref: "/omid-site",
    render: () => (
      <MemoryRouter initialEntries={["/omid"]}>
        <ArtistLinkPage slug="omid" />
      </MemoryRouter>
    ),
  },
  {
    slug: "morvarid",
    label: /visit the official site/i,
    expectedHref: "/morvarid-site",
    render: () => (
      <MemoryRouter initialEntries={["/morvarid"]}>
        <ArtistLinkPage slug="morvarid" />
      </MemoryRouter>
    ),
  },
  {
    slug: "andy",
    label: /visit the official site/i,
    expectedHref: "/andy-site",
    render: () => (
      <MemoryRouter initialEntries={["/andy"]}>
        <ArtistLinkPage slug="andy" />
      </MemoryRouter>
    ),
  },
];

describe("Artist Official Site CTA", () => {
  for (const c of CASES) {
    describe(c.slug, () => {
      it(`renders an Official Site link pointing at ${c.expectedHref}`, () => {
        render(c.render());
        // There may be more than one match (e.g. nav "Site" tab); pick
        // the one whose href is the expected site path.
        const links = screen.getAllByRole("link", { name: c.label });
        const match = links.find((el) => el.getAttribute("href") === c.expectedHref);
        expect(
          match,
          `expected an <a href="${c.expectedHref}"> matching ${c.label} for ${c.slug}, got hrefs: ${links
            .map((l) => l.getAttribute("href"))
            .join(", ")}`,
        ).toBeTruthy();
      });

      it(`destination ${c.expectedHref} is registered in App.tsx (won't 404)`, () => {
        // Either an explicit <Route path="/{slug}-site"> or one generated
        // by the roster .map() loop. Both prove the route resolves to a
        // real element instead of falling through to NotFound.
        const explicit = new RegExp(
          `<Route\\s+path=["']${c.expectedHref}["']`,
        );
        const rosterMap = new RegExp(
          `\\[[^\\]]*["']${c.slug}["'][^\\]]*\\][^\\n]*map[\\s\\S]{0,200}\\$\\{s\\}-site`,
        );
        const hasRoute = explicit.test(APP_SOURCE) || rosterMap.test(APP_SOURCE);
        expect(hasRoute, `no <Route> registered for ${c.expectedHref}`).toBe(true);
      });
    });
  }
});
