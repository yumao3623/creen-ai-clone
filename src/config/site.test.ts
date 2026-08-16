import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

describe("siteConfig", () => {
  it("keeps public navigation labels and links unique", () => {
    const labels = siteConfig.navigation.map((item) => item.label);
    const links = siteConfig.navigation.map((item) => item.href);

    expect(new Set(labels).size).toBe(labels.length);
    expect(new Set(links).size).toBe(links.length);
  });

  it("uses internal links for the foundation shell", () => {
    expect(
      siteConfig.navigation.every((item) => item.href.startsWith("/")),
    ).toBe(true);
  });
});
