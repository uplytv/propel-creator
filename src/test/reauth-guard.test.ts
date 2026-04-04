import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReauthGuard } from "@/hooks/useReauthGuard";

// Create a fresh IAT for testing
function makeToken(iatMs: number) {
  const payload = { iat: Math.floor(iatMs / 1000), exp: Math.floor(iatMs / 1000) + 3600 };
  const b64 = btoa(JSON.stringify(payload));
  return `header.${b64}.sig`;
}

const mockSignIn = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignIn(...args),
    },
  },
}));

const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: (...args: any[]) => mockToastError(...args), success: vi.fn() }),
}));

let mockSession: any = null;
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ session: mockSession }),
}));

describe("useReauthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it("runs action immediately if session is fresh (<10 min)", () => {
    const freshToken = makeToken(Date.now() - 5 * 60 * 1000); // 5 min ago
    mockSession = {
      access_token: freshToken,
      user: { email: "test@test.com" },
    };

    const action = vi.fn();
    const { result } = renderHook(() => useReauthGuard());

    act(() => {
      result.current.requireReauth(action);
    });

    expect(action).toHaveBeenCalledOnce();
    expect(result.current.showReauth).toBe(false);
  });

  it("shows reauth dialog if session is stale (>10 min)", () => {
    const staleToken = makeToken(Date.now() - 15 * 60 * 1000); // 15 min ago
    mockSession = {
      access_token: staleToken,
      user: { email: "test@test.com" },
    };

    const action = vi.fn();
    const { result } = renderHook(() => useReauthGuard());

    act(() => {
      result.current.requireReauth(action);
    });

    expect(action).not.toHaveBeenCalled();
    expect(result.current.showReauth).toBe(true);
  });

  it("runs pending action after successful reauth", async () => {
    const staleToken = makeToken(Date.now() - 15 * 60 * 1000);
    mockSession = {
      access_token: staleToken,
      user: { email: "test@test.com" },
    };
    mockSignIn.mockResolvedValue({ error: null });

    const action = vi.fn();
    const { result } = renderHook(() => useReauthGuard());

    act(() => {
      result.current.requireReauth(action);
    });

    expect(result.current.showReauth).toBe(true);

    let success: boolean = false;
    await act(async () => {
      success = await result.current.confirmReauth("password123");
    });

    expect(success).toBe(true);
    expect(action).toHaveBeenCalledOnce();
    expect(result.current.showReauth).toBe(false);
  });

  it("shows error toast on failed reauth", async () => {
    const staleToken = makeToken(Date.now() - 15 * 60 * 1000);
    mockSession = {
      access_token: staleToken,
      user: { email: "test@test.com" },
    };
    mockSignIn.mockResolvedValue({ error: new Error("Invalid password") });

    const action = vi.fn();
    const { result } = renderHook(() => useReauthGuard());

    act(() => {
      result.current.requireReauth(action);
    });

    let success: boolean = true;
    await act(async () => {
      success = await result.current.confirmReauth("wrong");
    });

    expect(success).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
  });

  it("cancels reauth and clears pending action", () => {
    const staleToken = makeToken(Date.now() - 15 * 60 * 1000);
    mockSession = {
      access_token: staleToken,
      user: { email: "test@test.com" },
    };

    const action = vi.fn();
    const { result } = renderHook(() => useReauthGuard());

    act(() => {
      result.current.requireReauth(action);
    });

    act(() => {
      result.current.cancelReauth();
    });

    expect(result.current.showReauth).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });
});
