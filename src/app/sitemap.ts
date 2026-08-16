import type { MetadataRoute } from "next";

import { marketingPages, supportPages } from "@/content/marketing";
import { absoluteUrl } from "@/lib/seo";

type IndexableRoute = Readonly<{
  path: `/${string}` | "/";
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
}>;

const indexableRoutes: readonly IndexableRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/features", changeFrequency: "monthly", priority: 0.8 },
  { path: "/models", changeFrequency: "monthly", priority: 0.7 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  ...marketingPages.map<IndexableRoute>(({ slug }) => ({
    path: `/${slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  })),
  ...supportPages.map<IndexableRoute>(({ slug }) => ({
    path: `/${slug}`,
    changeFrequency: "yearly",
    priority: 0.4,
  })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    changeFrequency,
    priority,
  }));
}
