import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useAccess } from "@/hooks/useAccess";

const mockMaybeSingle = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: mockMaybeSingle,
              }),
            }),
          }),
        }),
      }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: vi.fn(),
  },
}));

let mockUser: any = null;
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe("useAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-1" };
  });

  it("returns hasAccess=true when grant exists", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "g1", access_level: "full", granted_at: "2024-01-01", expires_at: null },
    });

    const { result } = renderHook(() => useAccess("space", "space-1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(true);
    expect(result.current.accessLevel).toBe("full");
  });

  it("returns hasAccess=false when no grant", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useAccess("space", "space-2"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(false);
  });

  it("returns hasAccess=false when grant is expired", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "g2",
        access_level: "full",
        granted_at: "2024-01-01",
        expires_at: "2020-01-01T00:00:00Z", // expired
      },
    });

    const { result } = renderHook(() => useAccess("space", "space-3"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(false);
  });

  it("returns isLoading=false when user is null", () => {
    mockUser = null;
    const { result } = renderHook(() => useAccess("space", "space-4"), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasAccess).toBe(false);
  });
});
