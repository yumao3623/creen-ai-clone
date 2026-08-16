import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

type SiteUrlEnvironment = Readonly<Record<string, string | undefined>>;

export type PublicPageSeo = Readonly<{
  title: string;
  description: string;
  path: `/${string}` | "/";
  keywords: readonly string[];
}>;

const localFallbackUrl = "http://localhost:3001";

export function siteUrl(environment: SiteUrlEnvironment = process.env): URL {
  const configuredUrl = environment.NEXT_PUBLIC_SITE_URL?.trim();
  const value = configuredUrl || localFallbackUrl;
  const url = new URL(value);
  const isLocalHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");

  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.",
    );
  }

  url.pathname = url.pathname.replace(/\/$/, "");
  return url;
}

export function absoluteUrl(path: PublicPageSeo["path"]): string {
  return new URL(path, `${siteUrl().toString()}/`).toString();
}

export function publicPageMetadata({
  title,
  description,
  path,
  keywords,
}: PublicPageSeo): Metadata {
  return {
    title,
    description,
    keywords: [...keywords],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: siteConfig.name,
      title,
      description,
      url: path,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function siteStructuredData(): Record<string, unknown> {
  const url = siteUrl().toString();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: siteConfig.name,
        url,
      },
      {
        "@type": "WebSite",
        name: siteConfig.name,
        url,
        inLanguage: "zh-CN",
      },
    ],
  };
}
