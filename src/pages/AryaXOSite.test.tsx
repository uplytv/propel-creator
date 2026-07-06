/**
 * Integration tests for the Arya XO artist site (rendered through the shared
 * ArtistSiteTemplate). Confirms (a) every visible button routes to the
 * correct URL/section, and (b) the booking form reliably inserts an inquiry
 * into the UPLY CRM (`public_booking_inquiries`) and surfaces the success state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Supabase mock ─────────────────────────────────────────
const insertMock = vi.fn<(payload: unknown) => Promise<{ error: unknown }>>()
  .mockResolvedValue({ error: null });
const rpcMock = vi.fn<(name: string, params?: unknown) => Promise<{ data: unknown; error: unknown }>>()
  .mockResolvedValue({ data: null, error: null });
const tourSelectChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
};
const fromMock = vi.fn((table: string) => {
  if (table === "public_booking_inquiries") return { insert: insertMock };
  return tourSelectChain;
});
const channelMock = vi.fn((_name: string) => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}));


vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    rpc: (name: string, params?: unknown) => rpcMock(name, params),
    channel: (name: string) => channelMock(name),
    removeChannel: vi.fn(),
  },
}));

import AryaXOSite from "./AryaXOSite";

const renderSite = () =>
  render(
    <MemoryRouter initialEntries={["/arya-xo-site"]}>
      <AryaXOSite />
    </MemoryRouter>,
  );

beforeEach(() => {
  insertMock.mockClear();
  rpcMock.mockClear();
  fromMock.mockClear();
});

// ── Routing / button targets ──────────────────────────────
describe("AryaXOSite — buttons route correctly", () => {
  it("nav anchors point to the right in-page sections", () => {
    renderSite();
    const nav = screen.getByRole("navigation", { name: /site sections/i });
    const expectAnchor = (label: string, href: string) => {
      const el = within(nav).getByRole("link", { name: label });
      expect(el).toHaveAttribute("href", href);
    };
    expectAnchor("Music", "#music");
    expectAnchor("Videos", "#videos");
    expectAnchor("About", "#about");
    expectAnchor("Tour", "#tour");
    expectAnchor("Booking", "#booking");
  });

  it("nav Links buttons route to the /arya-xo links hub", () => {
    renderSite();
    const links = screen.getAllByRole("link", { name: /^Links$/ });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((el) => expect(el).toHaveAttribute("href", "/arya-xo"));
  });

  it("hero streaming pills deep-link 150 BANDS on Spotify / Apple / YouTube", () => {
    renderSite();
    const hero = screen.getByRole("banner");

    const spotify = within(hero).getByRole("link", { name: /^Spotify$/ });
    expect(spotify).toHaveAttribute(
      "href",
      "https://open.spotify.com/track/3QBkhZL0nUSrm6qcoSEZvt"
    );
    expect(spotify).toHaveAttribute("target", "_blank");
    expect(spotify).toHaveAttribute("rel", expect.stringContaining("noopener"));

    expect(within(hero).getByRole("link", { name: /^Apple Music$/ })).toHaveAttribute(
      "href",
      "https://music.apple.com/us/song/150-bands/6778877438"
    );
    expect(within(hero).getByRole("link", { name: /^YouTube$/ })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=gqYburgfJ9s"
    );
  });

  it('hero "Book" pill jumps to the booking section', () => {
    renderSite();
    const hero = screen.getByRole("banner");
    expect(within(hero).getByRole("link", { name: /^Book$/ })).toHaveAttribute("href", "#booking");
  });

  it("release cards link out to Spotify with proper rel/target", () => {
    renderSite();
    const get = screen.getByRole("link", { name: /Get Down/i });
    expect(get).toHaveAttribute(
      "href",
      "https://open.spotify.com/search/Arya%20XO%20Get%20Down%20Roy%20Woods"
    );
    expect(get).toHaveAttribute("target", "_blank");
  });

  it("YouTube 'Watch on YouTube' link uses the watch URL", () => {
    renderSite();
    const watch = screen.getByRole("link", { name: /Watch on YouTube/i });
    expect(watch).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=Datko9ejIHY"
    );
  });

  it("socials grid routes to the right external profiles", () => {
    renderSite();
    const ig = screen.getByRole("link", { name: /Instagram/i });
    expect(ig).toHaveAttribute("href", "https://www.instagram.com/litreeezy/");

    // YouTube appears more than once (hero pill + video link + social card)
    const yt = screen
      .getAllByRole("link", { name: /YouTube/i })
      .find((el) => el.getAttribute("href")?.includes("@litreeezy"));
    expect(yt?.getAttribute("href")).toMatch(/youtube\.com\/@litreeezy/);

    const apple = screen
      .getAllByRole("link", { name: /Apple Music/i })
      .find((el) => el.getAttribute("href")?.includes("/artist/"));
    expect(apple?.getAttribute("href")).toMatch(/music\.apple\.com/);

    const spotify = screen
      .getAllByRole("link", { name: /Spotify/i })
      .find((el) => el.getAttribute("href")?.includes("/search/"));
    expect(spotify?.getAttribute("href")).toMatch(/open\.spotify\.com\/search\/Arya/);
  });


  it("footer 'Powered by UPLY' links to home", () => {
    renderSite();
    const footer = screen.getByRole("contentinfo");
    const home = within(footer).getByRole("link");
    expect(home).toHaveAttribute("href", "/");
  });

  it("Share button opens the share modal with the canonical URL + copy action", async () => {
    // Force the fallback modal path (no navigator.share)
    Object.defineProperty(window.navigator, "share", { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderSite();
    fireEvent.click(screen.getByRole("button", { name: /Share this page/i }));

    // Every share mints a fresh cache-busting `?v=` on the canonical URL
    const url = await screen.findByDisplayValue((v: string) =>
      v.startsWith("https://uply.tv/arya-xo-site?v=")
    );
    expect(url).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Copy$/i }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/uply\.tv\/arya-xo-site\?v=/)
      )
    );
    expect(await screen.findByRole("button", { name: /Copied/i })).toBeInTheDocument();
  });
});

// ── Booking form → CRM insert ─────────────────────────────
describe("AryaXOSite — booking form writes to UPLY CRM", () => {
  it("submits a complete inquiry into public_booking_inquiries and shows success", async () => {
    renderSite();

    fireEvent.change(screen.getByPlaceholderText("Jane Doe"), {
      target: { value: "Promoter Pete" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@venue.com"), {
      target: { value: "pete@drais.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Venue, festival/), {
      target: { value: "Drai's Beach Club" },
    });
    fireEvent.change(screen.getByPlaceholderText("Las Vegas, USA"), {
      target: { value: "Las Vegas, USA" },
    });
    fireEvent.change(screen.getByPlaceholderText("25000"), {
      target: { value: "75000" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Headliner/), {
      target: { value: "HUGEL, Roy Woods" },
    });
    fireEvent.change(screen.getByPlaceholderText(/60-min set/), {
      target: { value: "Headline, 75 min" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Send booking inquiry/i }));

    await waitFor(() => expect(fromMock).toHaveBeenCalledWith("public_booking_inquiries"));
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        artist_slug: "arya-xo",
        contact_name: "Promoter Pete",
        contact_email: "pete@drais.com",
        contact_org: "Drai's Beach Club",
        event_city: "Las Vegas, USA",
        budget_usd: 75000,
        lineup: "HUGEL, Roy Woods",
        message: "Headline, 75 min",
        source: "arya-xo-site",
      })
    );

    expect(await screen.findByText(/Inquiry sent\./i)).toBeInTheDocument();
  });

  it("blocks submission until name + valid email + city are provided", () => {
    renderSite();
    const submit = screen.getByRole("button", { name: /Send booking inquiry/i }) as HTMLButtonElement;
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Jane Doe"), { target: { value: "A" } });
    fireEvent.change(screen.getByPlaceholderText("you@venue.com"), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByPlaceholderText("Las Vegas, USA"), {
      target: { value: "Miami" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("you@venue.com"), {
      target: { value: "a@b.co" },
    });
    expect(submit).not.toBeDisabled();
  });

  it("surfaces a friendly error if the CRM insert fails", async () => {
    insertMock.mockResolvedValueOnce({ error: { message: "Network down" } });
    renderSite();

    fireEvent.change(screen.getByPlaceholderText("Jane Doe"), { target: { value: "P" } });
    fireEvent.change(screen.getByPlaceholderText("you@venue.com"), {
      target: { value: "p@x.co" },
    });
    fireEvent.change(screen.getByPlaceholderText("Las Vegas, USA"), {
      target: { value: "NYC" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send booking inquiry/i }));

    expect(await screen.findByText(/Network down/i)).toBeInTheDocument();
    expect(screen.queryByText(/Inquiry sent\./i)).not.toBeInTheDocument();
  });
});
