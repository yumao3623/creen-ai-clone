import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { updateSupabaseSession } from "@/integrations/supabase/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

function withoutSupabaseCredentials() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
}

describe("Supabase root proxy guard integration", () => {
  it("keeps the public Studio available when credentials are absent", async () => {
    withoutSupabaseCredentials();
    const response = await updateSupabaseSession(
      new NextRequest("https://app.example/studio"),
    );

    expect(response.status).toBe(200);
  });

  it("redirects protected pages to a safe local login URL", async () => {
    withoutSupabaseCredentials();
    const response = await updateSupabaseSession(
      new NextRequest("https://app.example/account"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example/login?error=auth_unavailable&next=%2Faccount",
    );
  });

  it("returns JSON rather than an HTML redirect for protected APIs", async () => {
    withoutSupabaseCredentials();
    const response = await updateSupabaseSession(
      new NextRequest("https://app.example/api/generate", { method: "POST" }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { code: "auth_unavailable" },
    });
  });
});
