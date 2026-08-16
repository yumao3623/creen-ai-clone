import { describe, expect, it } from "vitest";

import { GET } from "@/app/auth/callback/route";

describe("OAuth callback contract", () => {
  it("maps a provider cancellation to a stable application error", async () => {
    const response = await GET(
      new Request(
        "https://app.example/auth/callback?error=access_denied&next=%2Fstudio",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example/login?error=oauth_cancelled&next=%2Fstudio",
    );
  });

  it("does not allow an external callback destination", async () => {
    const response = await GET(
      new Request(
        "https://app.example/auth/callback?error=access_denied&next=%2F%2Fevil.example",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.example/login?error=oauth_cancelled&next=%2Faccount",
    );
  });
});
