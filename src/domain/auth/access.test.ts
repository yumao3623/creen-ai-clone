import { describe, expect, it } from "vitest";

import {
  decideProtectedAccess,
  isProtectedApi,
  isProtectedPage,
  safeInternalPath,
} from "@/domain/auth/access";

describe("authentication access policy", () => {
  it("protects account, Checkout confirmation, and real command APIs", () => {
    expect(isProtectedPage("/account/history")).toBe(true);
    expect(isProtectedApi("/api/generate/image")).toBe(true);
    expect(isProtectedPage("/checkout/return")).toBe(true);
    expect(isProtectedApi("/api/stripe/checkout")).toBe(true);
    expect(isProtectedApi("/api/webhooks/stripe")).toBe(false);
    expect(isProtectedPage("/studio")).toBe(false);
    expect(isProtectedApi("/api/public-example")).toBe(false);
  });

  it("rejects unauthenticated API requests without redirecting", () => {
    expect(
      decideProtectedAccess({
        pathname: "/api/generate",
        isAuthenticated: false,
        authConfigured: true,
        hadAuthCookie: false,
      }),
    ).toEqual({
      kind: "reject",
      status: 401,
      code: "authentication_required",
    });
  });

  it("distinguishes a missing session from an expired one", () => {
    expect(
      decideProtectedAccess({
        pathname: "/account",
        isAuthenticated: false,
        authConfigured: true,
        hadAuthCookie: true,
      }),
    ).toEqual({
      kind: "redirect",
      destination: "/login?error=session_expired&next=%2Faccount",
    });
  });

  it("blocks open redirects", () => {
    expect(safeInternalPath("/studio")).toBe("/studio");
    expect(safeInternalPath("//evil.example")).toBe("/account");
    expect(safeInternalPath("https://evil.example")).toBe("/account");
  });
});
