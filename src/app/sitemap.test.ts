import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { marketingPages, supportPages } from "@/content/marketing";

describe("Phase 10 sitemap and robots", () => {
  it("includes every approved public page and excludes private routes", () => {
    const urls = sitemap().map(({ url }) => new URL(url).pathname);
    const expectedPublicPaths = [
      "/",
      "/features",
      "/models",
      "/pricing",
      ...marketingPages.map(({ slug }) => `/${slug}`),
      ...supportPages.map(({ slug }) => `/${slug}`),
    ];

    expect(urls).toEqual(expectedPublicPaths);
    expect(urls).not.toContain("/account");
    expect(urls).not.toContain("/studio");
    expect(urls).not.toContain("/checkout/return");
  });

  it("allows public pages while blocking private, auth, checkout, and API boundaries", () => {
    const policy = robots();
    const rules = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;

    expect(rules).toMatchObject({ userAgent: "*", allow: "/" });
    expect(rules?.disallow).toEqual(
      expect.arrayContaining([
        "/account/",
        "/api/",
        "/auth/",
        "/checkout/",
        "/studio",
      ]),
    );
    expect(policy.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
