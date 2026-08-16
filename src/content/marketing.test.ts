import { describe, expect, it } from "vitest";

import {
  marketingPageFor,
  marketingPages,
  supportPageFor,
  supportPages,
} from "@/content/marketing";

describe("Phase 9 public page content", () => {
  it("defines the five frozen landing pages with distinct intent, FAQ, and working internal links", () => {
    expect(marketingPages.map((page) => page.slug)).toEqual([
      "ai-image-generator",
      "ai-video-generator",
      "text-to-image",
      "image-to-video",
      "text-to-speech",
    ]);
    expect(marketingPages.every((page) => page.related.length > 0)).toBe(true);
    expect(marketingPages.every((page) => page.faq.length >= 2)).toBe(true);
    expect(new Set(marketingPages.map((page) => page.seo.intent)).size).toBe(
      marketingPages.length,
    );
    const knownLinks = new Set([
      "/studio",
      "/pricing",
      ...marketingPages.map((page) => `/${page.slug}`),
    ]);
    expect(
      marketingPages.every((page) =>
        page.related.every((item) => knownLinks.has(item.href)),
      ),
    ).toBe(true);
    expect(marketingPageFor("image-to-video")?.capability).toBe(
      "Image to Video",
    );
  });

  it("defines the Candidate M support and legal shell without a catch-all fallback", () => {
    expect(supportPages.map((page) => page.slug)).toEqual([
      "faq",
      "about",
      "contact",
      "privacy",
      "terms",
      "refund",
    ]);
    expect(supportPageFor("missing-page")).toBeUndefined();
    expect(new Set(supportPages.map((page) => page.seo.intent)).size).toBe(
      supportPages.length,
    );
  });
});
