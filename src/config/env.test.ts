import { describe, expect, it } from "vitest";

import { readSupabasePublicConfig } from "@/config/env";

describe("readSupabasePublicConfig", () => {
  it("returns null when auth is intentionally unconfigured", () => {
    expect(readSupabasePublicConfig({})).toBeNull();
  });

  it("accepts the current publishable key name", () => {
    expect(
      readSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      key: "sb_publishable_example",
    });
  });

  it("supports the legacy anon key during migration", () => {
    expect(
      readSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-anon-key",
      }),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      key: "legacy-anon-key",
    });
  });

  it("rejects incomplete and insecure remote configuration", () => {
    expect(() =>
      readSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow(/配置不完整/);

    expect(() =>
      readSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key",
      }),
    ).toThrow(/HTTPS/);
  });
});
