import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

// Mock supabase
const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}));

vi.mock("@/lib/sentry", () => ({
  setSentryUser: vi.fn(),
  clearSentryUser: vi.fn(),
}));

vi.mock("@/lib/posthog", () => ({
  identifyUser: vi.fn(),
  resetPostHog: vi.fn(),
}));

function TestConsumer() {
  const { user, loading, session } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.id ?? "none"}</span>
      <span data-testid="session">{session ? "active" : "none"}</span>
    </div>
  );
}

describe("AuthContext", () => {
  let authCallback: (event: string, session: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });
  });

  it("starts in loading state then resolves", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("user").textContent).toBe("none");
    expect(screen.getByTestId("session").textContent).toBe("none");
  });

  it("reflects a logged-in user from getSession", async () => {
    const mockSession = {
      user: { id: "user-123", email: "test@test.com", created_at: "2024-01-01" },
      access_token: "token",
    };
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user-123");
    });
    expect(screen.getByTestId("session").textContent).toBe("active");
  });

  it("updates when onAuthStateChange fires", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    // Simulate login via auth state change
    act(() => {
      authCallback("SIGNED_IN", {
        user: { id: "user-456", email: "a@b.com", created_at: "2024-01-01" },
        access_token: "tok",
      });
    });

    expect(screen.getByTestId("user").textContent).toBe("user-456");
  });

  it("throws when useAuth is called outside provider", () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useAuth must be used within AuthProvider");
    spy.mockRestore();
  });
});
