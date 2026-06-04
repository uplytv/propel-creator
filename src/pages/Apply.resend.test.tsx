import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// Hoisted mocks — accessible inside vi.mock factories (which are hoisted to top)
const { invokeMock, fromMock, toastMock, navigateMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  fromMock: vi.fn((_table?: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: { first_name: "Alex", last_name: "Lee", display_name: null, is_approved: false },
          error: null,
        }),
      }),
    }),
    upsert: async (_v: unknown) => ({ data: null, error: null }),
    update: (_v: unknown) => ({
      eq: async (_c: string, _val: unknown) => ({ data: null, error: null }),
    }),
  })),
  toastMock: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
  navigateMock: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "creator@example.com" },
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    functions: { invoke: (name: string, opts: unknown) => invokeMock(name, opts) },
  },
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/assets/logo.png", () => ({ default: "logo.png" }));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const pass = (tag: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(tag, { ...props, ref }, children),
    );
  return {
    motion: new Proxy({}, { get: (_t, key: string) => pass(key as string) }),
    AnimatePresence: ({ children }: any) => children,
  };
});

import Apply from "./Apply";


async function walkThroughFormToSuccess() {
  render(<Apply />);
  // Wait for prefill effect to populate the name field
  await waitFor(() => {
    const input = screen.getByPlaceholderText(/First and last name/i) as HTMLInputElement;
    expect(input.value).toBe("Alex Lee");
  });

  const clickContinueOrSubmit = () => {
    const btn = screen
      .getAllByRole("button")
      .find(
        (b) =>
          !(b as HTMLButtonElement).disabled &&
          /Continue|Submit|See my result/i.test(b.textContent || ""),
      );
    if (!btn) throw new Error("No actionable button found");
    fireEvent.click(btn);
  };

  // Step 0 → Step 1
  clickContinueOrSubmit();
  // Step 1: creator type
  fireEvent.click(await screen.findByRole("button", { name: "Music" }));
  clickContinueOrSubmit();
  // Step 2: platform
  fireEvent.click(await screen.findByRole("button", { name: "Instagram" }));
  clickContinueOrSubmit();
  // Step 3: followers (pick a qualifying tier)
  fireEvent.click(await screen.findByRole("button", { name: /50K – 100K/i }));
  clickContinueOrSubmit();
  // Step 4: earnings
  fireEvent.click(await screen.findByRole("button", { name: /\$2K – \$10K \/ mo/i }));
  // Submit
  await act(async () => {
    clickContinueOrSubmit();
  });

  // Wait for success screen
  await screen.findByText(/Application sent!/i);
}

describe("Apply — resend confirmation flow", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    navigateMock.mockReset();
    // Default: every invoke resolves
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("submission send uses a stable idempotency key and resend uses a unique key (idempotency)", async () => {
    await walkThroughFormToSuccess();

    // First invoke = submission confirmation send
    expect(invokeMock).toHaveBeenCalledTimes(1);
    const submitCallKey = invokeMock.mock.calls[0][1].body.idempotencyKey;
    expect(submitCallKey).toBe("apply-confirm-user-123");

    // Click resend
    const resendBtn = screen.getByRole("button", { name: /Resend confirmation email/i });
    await act(async () => {
      fireEvent.click(resendBtn);
    });

    expect(invokeMock).toHaveBeenCalledTimes(2);
    const resendKey = invokeMock.mock.calls[1][1].body.idempotencyKey;
    // Resend must use a fresh key (timestamped) — never reuse the submit key
    expect(resendKey).not.toBe(submitCallKey);
    expect(resendKey).toMatch(/^apply-confirm-user-123-\d+$/);

    // Both invocations target the same template + recipient
    for (const call of invokeMock.mock.calls) {
      expect(call[0]).toBe("send-transactional-email");
      expect(call[1].body.templateName).toBe("application-confirmation");
      expect(call[1].body.recipientEmail).toBe("creator@example.com");
    }
  });

  it("shows success toast and re-enables the button on a successful resend", async () => {
    await walkThroughFormToSuccess();
    invokeMock.mockClear();
    invokeMock.mockResolvedValueOnce({ data: { ok: true }, error: null });

    const resendBtn = screen.getByRole("button", { name: /Resend confirmation email/i });
    await act(async () => {
      fireEvent.click(resendBtn);
    });

    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringMatching(/resent/i),
    );
    expect(toastMock.error).not.toHaveBeenCalled();

    // Button must be interactive again after the request settles
    const btnAfter = screen.getByRole("button", { name: /Resend confirmation email/i });
    expect((btnAfter as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows an error toast and re-enables the button when resend fails", async () => {
    await walkThroughFormToSuccess();
    invokeMock.mockClear();
    invokeMock.mockRejectedValueOnce(new Error("Network down"));

    const resendBtn = screen.getByRole("button", { name: /Resend confirmation email/i });
    await act(async () => {
      fireEvent.click(resendBtn);
    });

    expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/Network down/i));
    expect(toastMock.success).not.toHaveBeenCalled();
    const btnAfter = screen.getByRole("button", { name: /Resend confirmation email/i });
    expect((btnAfter as HTMLButtonElement).disabled).toBe(false);
  });

  it("clicking resend multiple times produces distinct idempotency keys each time", async () => {
    await walkThroughFormToSuccess();
    invokeMock.mockClear();

    const click = async () => {
      const btn = screen.getByRole("button", { name: /Resend confirmation email/i });
      await act(async () => {
        fireEvent.click(btn);
      });
    };

    await click();
    // Small wait to ensure Date.now() advances
    await new Promise((r) => setTimeout(r, 5));
    await click();
    await new Promise((r) => setTimeout(r, 5));
    await click();

    expect(invokeMock).toHaveBeenCalledTimes(3);
    const keys = invokeMock.mock.calls.map((c) => c[1].body.idempotencyKey);
    expect(new Set(keys).size).toBe(3);
    for (const k of keys) {
      expect(k).toMatch(/^apply-confirm-user-123-\d+$/);
    }
  });
});
