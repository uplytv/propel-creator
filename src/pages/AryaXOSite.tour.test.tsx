/**
 * E2E-style tests for the Tour-demand voting widget on AryaXOSite.
 *  - one vote per device (localStorage gate) + RPC dispatched with voter fingerprint
 *  - cities ranked by vote_count (top 3 rendered as featured cards, rest as list)
 *  - realtime postgres_changes payload triggers a refetch and the featured cards
 *    re-rank when the underlying data changes
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";

type Row = { id: string; city: string; country: string; vote_count: number };

// Mutable dataset the mocked `.limit()` returns; tests reassign it.
let tourRows: Row[] = [];
// Capture the realtime callback registered by the component
let realtimeCb: ((payload: unknown) => void) | null = null;

const insertMock = vi.fn().mockResolvedValue({ error: null });
const rpcMock = vi.fn().mockResolvedValue({ data: "new-id", error: null });

const tourSelectChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn(() => Promise.resolve({ data: tourRows, error: null })),
};

const fromMock = vi.fn((table: string) => {
  if (table === "public_booking_inquiries") return { insert: insertMock };
  return tourSelectChain;
});

const channelMock = vi.fn(() => ({
  on: vi.fn((_evt: string, _filter: unknown, cb: (p: unknown) => void) => {
    realtimeCb = cb;
    return { subscribe: vi.fn().mockReturnThis() };
  }),
  subscribe: vi.fn().mockReturnThis(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => fromMock(t),
    rpc: (n: string, p?: unknown) => rpcMock(n, p),
    channel: (n: string) => channelMock(n),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/assets/arya-xo-150bands.png.asset.json", () => ({
  default: { url: "https://cdn.test/portrait.png" },
}));
vi.mock("@/assets/arya-xo-bg.png.asset.json", () => ({
  default: { url: "https://cdn.test/bg.png" },
}));

import AryaXOSite from "./AryaXOSite";

const seed: Row[] = [
  { id: "nyc", city: "New York", country: "USA", vote_count: 10 },
  { id: "la", city: "Los Angeles", country: "USA", vote_count: 7 },
  { id: "tor", city: "Toronto", country: "Canada", vote_count: 5 },
  { id: "lon", city: "London", country: "UK", vote_count: 3 },
];

beforeEach(() => {
  localStorage.clear();
  insertMock.mockClear();
  rpcMock.mockClear().mockResolvedValue({ data: "new-id", error: null });
  fromMock.mockClear();
  channelMock.mockClear();
  realtimeCb = null;
  tourRows = [...seed];
});

async function renderAndWaitForCities() {
  render(<AryaXOSite />);
  await screen.findByRole("button", { name: /New York/ });
}

describe("Tour-demand widget — ranking", () => {
  it("renders cities ordered by vote_count (top 3 as featured cards)", async () => {
    await renderAndWaitForCities();

    // Order request goes to backend by vote_count desc
    expect(tourSelectChain.order).toHaveBeenCalledWith("vote_count", { ascending: false });

    // Featured cards are buttons; list-rest items appear in the ranked <ul>
    const nyc = screen.getByRole("button", { name: /New York/ });
    const la = screen.getByRole("button", { name: /Los Angeles/ });
    const tor = screen.getByRole("button", { name: /Toronto/ });
    expect(nyc.compareDocumentPosition(la) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(la.compareDocumentPosition(tor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 4th city falls into the list section with rank #4
    expect(screen.getByText("#4")).toBeInTheDocument();
    expect(screen.getByText(/London, UK/)).toBeInTheDocument();
  });
});

describe("Tour-demand widget — one vote per device", () => {
  it("calls vote RPC with the persistent voter fingerprint and disables re-voting", async () => {
    await renderAndWaitForCities();

    const nyc = screen.getByRole("button", { name: /New York/ });
    fireEvent.click(nyc);

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    const [fnName, params] = rpcMock.mock.calls[0];
    expect(fnName).toBe("vote_public_tour_request");
    expect(params).toMatchObject({ _request_id: "nyc" });
    expect((params as { _voter_fp: string })._voter_fp).toBeTruthy();

    // Persisted device gate
    const voted = JSON.parse(localStorage.getItem("uply_voted_tour_arya-xo") || "[]");
    expect(voted).toContain("nyc");
    expect(localStorage.getItem("uply_voter_fp")).toBeTruthy();

    // Same card now reflects voted state and a second click is a no-op
    await waitFor(() =>
      expect(within(nyc).getByText(/Voted/i)).toBeInTheDocument()
    );
    fireEvent.click(nyc);
    fireEvent.click(nyc);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("persists the device gate across remounts (same vote_fp reused)", async () => {
    const { unmount } = render(<AryaXOSite />);
    await screen.findByRole("button", { name: /New York/ });
    fireEvent.click(screen.getByRole("button", { name: /New York/ }));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    const fpBefore = localStorage.getItem("uply_voter_fp");
    unmount();

    render(<AryaXOSite />);
    await screen.findByRole("button", { name: /New York/ });
    // Reuses fingerprint, no new vote permitted
    expect(localStorage.getItem("uply_voter_fp")).toBe(fpBefore);
    fireEvent.click(screen.getByRole("button", { name: /New York/ }));
    // Still just the one RPC from the first session
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });
});

describe("Tour-demand widget — realtime updates", () => {
  it("re-fetches and re-ranks featured cards when a realtime change fires", async () => {
    await renderAndWaitForCities();
    expect(realtimeCb).toBeTruthy();

    // Toronto surges past LA and NYC in the backend
    tourRows = [
      { id: "tor", city: "Toronto", country: "Canada", vote_count: 42 },
      { id: "nyc", city: "New York", country: "USA", vote_count: 10 },
      { id: "la", city: "Los Angeles", country: "USA", vote_count: 7 },
      { id: "lon", city: "London", country: "UK", vote_count: 3 },
    ];

    await act(async () => {
      realtimeCb!({ eventType: "UPDATE", new: tourRows[0] });
    });

    await waitFor(() => {
      // Toronto card now shows the new vote count
      const tor = screen.getByRole("button", { name: /Toronto/ });
      expect(within(tor).getByText(/42 votes/)).toBeInTheDocument();
      // And is ordered before New York in the featured row
      const nyc = screen.getByRole("button", { name: /New York/ });
      expect(tor.compareDocumentPosition(nyc) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
