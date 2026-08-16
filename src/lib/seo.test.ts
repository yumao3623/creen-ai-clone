import { describe, expect, it } from "vitest";

import {
  noIndexMetadata,
  publicPageMetadata,
  serializeJsonLd,
  siteStructuredData,
  siteUrl,
} from "@/lib/seo";

describe("SEO metadata helpers", () => {
  it("uses a local fallback and normalizes a configured deployment URL", () => {
    expect(siteUrl({}).toString()).toBe("http://localhost:3001/");
    expect(
      siteUrl({ NEXT_PUBLIC_SITE_URL: "https://app.example.com/" }).toString(),
    ).toBe("https://app.example.com/");
    expect(() =>
      siteUrl({ NEXT_PUBLIC_SITE_URL: "http://app.example.com" }),
    ).toThrow("HTTPS");
  });

  it("sets a canonical URL and complete social metadata for public pages", () => {
    const metadata = publicPageMetadata({
      title: "AI 图片生成器",
      description: "使用文字提示创建图片。",
      path: "/ai-image-generator",
      keywords: ["AI 图片生成器"],
    });

    expect(metadata.alternates?.canonical).toBe("/ai-image-generator");
    expect(metadata.openGraph).toMatchObject({
      title: "AI 图片生成器",
      url: "/ai-image-generator",
      locale: "zh_CN",
    });
    expect(noIndexMetadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it("serializes structured data without permitting a closing script tag", () => {
    expect(serializeJsonLd({ value: "</script>" })).toBe(
      '{"value":"\\u003c/script>"}',
    );
    expect(siteStructuredData()).toMatchObject({
      "@context": "https://schema.org",
    });
  });
});
