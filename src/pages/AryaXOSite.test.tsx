/**
 * Integration tests for the Arya XO embedded artist site.
 * Confirms (a) every visible button routes to the correct URL/section,
 * and (b) the booking form reliably inserts an inquiry into the UPLY CRM
 * (`public_booking_inquiries`) and surfaces the success state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

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


// Asset JSON files
vi.mock("@/assets/arya-xo-150bands.png.asset.json", () => ({
  default: { url: "https://cdn.test/portrait.png" },
}));
vi.mock("@/assets/arya-xo-bg.png.asset.json", () => ({
  default: { url: "https://cdn.test/bg.png" },
}));

import AryaXOSite from "./AryaXOSite";

beforeEach(() => {
  insertMock.mockClear();
  rpcMock.mockClear();
  fromMock.mockClear();
});

// ── Routing / button targets ──────────────────────────────
describe("AryaXOSite — buttons route correctly", () => {
  it("nav anchors point to the right in-page sections", () => {
    render(<AryaXOSite />);
    const nav = screen.getAllByRole("navigation")[0];
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

  it("nav Links button routes to /arya-xo public profile", () => {
    render(<AryaXOSite />);
    const links = screen.getAllByRole("link", { name: /^Links$/ });
    expect(links[0]).toHaveAttribute("href", "/arya-xo");
  });

  it('hero "Stream 150 BANDS" opens the Spotify deep link in a new tab', () => {
    render(<AryaXOSite />);
    const stream = screen.getByRole("link", { name: /Stream 150 BANDS/i });
    expect(stream).toHaveAttribute(
      "href",
      "https://open.spotify.com/search/150%20Bands%20Hugel"
    );
    expect(stream).toHaveAttribute("target", "_blank");
    expect(stream).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it('hero "Book Arya XO" jumps to the booking section', () => {
    render(<AryaXOSite />);
    const book = screen.getByRole("link", { name: /Book Arya XO/i });
    expect(book).toHaveAttribute("href", "#booking");
  });

  it("release cards link out to Spotify with proper rel/target", () => {
    render(<AryaXOSite />);
    const get = screen.getByRole("link", { name: /Get Down/i });
    expect(get).toHaveAttribute(
      "href",
      "https://open.spotify.com/search/Arya%20XO%20Get%20Down%20Roy%20Woods"
    );
    expect(get).toHaveAttribute("target", "_blank");
  });

  it("YouTube 'Watch on YouTube' link uses the watch URL", () => {
    render(<AryaXOSite />);
    const watch = screen.getByRole("link", { name: /Watch on YouTube/i });
    expect(watch).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=Datko9ejIHY"
    );
  });

  it("social row routes to the right external profiles", () => {
    render(<AryaXOSite />);
    const ig = screen.getByRole("link", { name: /Instagram/i });
    expect(ig).toHaveAttribute("href", "https://www.instagram.com/litreeezy/");

    // YouTube appears twice (video link + social pill) — find the social pill
    const yt = screen
      .getAllByRole("link", { name: /YouTube/i })
      .find((el) => el.getAttribute("href")?.includes("@litreeezy"));
    expect(yt?.getAttribute("href")).toMatch(/youtube\.com\/@litreeezy/);

    expect(screen.getByRole("link", { name: /Apple Music/i }).getAttribute("href"))
      .toMatch(/music\.apple\.com/);
    expect(screen.getByRole("link", { name: /Spotify/i }).getAttribute("href"))
      .toMatch(/open\.spotify\.com\/search\/Arya/);
  });


  it("footer 'Powered by UPLY' links to home", () => {
    render(<AryaXOSite />);
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

    render(<AryaXOSite />);
    fireEvent.click(screen.getByRole("button", { name: /Share this page/i }));

    const url = await screen.findByDisplayValue("https://uply.tv/arya-xo-site");
    expect(url).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Copy$/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://uply.tv/arya-xo-site"));
    expect(await screen.findByRole("button", { name: /Copied/i })).toBeInTheDocument();
  });
});

// ── Booking form → CRM insert ─────────────────────────────
describe("AryaXOSite — booking form writes to UPLY CRM", () => {
  it("submits a complete inquiry into public_booking_inquiries and shows success", async () => {
    render(<AryaXOSite />);

    fireEvent.change(screen.getByPlaceholderText("Jane Doe"), {
      target: { value: "Promoter Pete" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@venue.com"), {
      target: { value: "pete@drais.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Drai/), {
      target: { value: "Drai's Beach Club" },
    });
    fireEvent.change(screen.getByPlaceholderText("Las Vegas, USA"), {
      target: { value: "Las Vegas, USA" },
    });
    fireEvent.change(screen.getByPlaceholderText("25000"), {
      target: { value: "75000" },
    });
    fireEvent.change(screen.getByPlaceholderText(/HUGEL/), {
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
    render(<AryaXOSite />);
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
    render(<AryaXOSite />);

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
