import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

// Mock auth context
const mockAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockAuth(),
}));

// Mock supabase
const mockFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), unsubscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
}));

function renderWithRouter(initialRoute = "/protected") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/protected" element={
          <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
        } />
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route path="/onboarding" element={<div>Onboarding Page</div>} />
        <Route path="/waitlist" element={<div>Waitlist Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /auth when user is not authenticated", async () => {
    mockAuth.mockReturnValue({ session: null, user: null, loading: false });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Auth Page")).toBeInTheDocument();
    });
  });

  it("shows spinner while loading", () => {
    mockAuth.mockReturnValue({ session: null, user: null, loading: true });

    renderWithRouter();

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.queryByText("Auth Page")).not.toBeInTheDocument();
  });

  it("shows protected content when user is admin", async () => {
    mockAuth.mockReturnValue({
      session: { user: { id: "u1" } },
      user: { id: "u1" },
      loading: false,
    });

    // user_roles query returns admin
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [{ role: "admin" }] }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          limit: () => ({ single: () => Promise.resolve({ data: null }) }),
          eq: () => ({ single: () => Promise.resolve({ data: null }) }),
        }),
      };
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });
});
