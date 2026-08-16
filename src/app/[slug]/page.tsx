import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  marketingPageFor,
  marketingPages,
  supportPageFor,
  supportPages,
} from "@/content/marketing";
import { MarketingPageTemplate } from "@/components/marketing-page";
import { publicPageMetadata } from "@/lib/seo";

const allPages = [...marketingPages, ...supportPages] as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return allPages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = marketingPageFor(slug) ?? supportPageFor(slug);
  if (!page) notFound();

  return publicPageMetadata({
    title: page.seo.title,
    description: page.seo.description,
    path: `/${page.slug}`,
    keywords: page.seo.keywords,
  });
}

export default async function PublicPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const marketingPage = marketingPageFor(slug);
  if (marketingPage) return <MarketingPageTemplate page={marketingPage} />;

  const supportPage = supportPageFor(slug);
  if (!supportPage) notFound();

  return (
    <main className="support-page" id="main-content" tabIndex={-1}>
      <section aria-labelledby="support-title">
        <p className="eyebrow">{supportPage.eyebrow}</p>
        <h1 id="support-title">{supportPage.title}</h1>
        <p>{supportPage.description}</p>
      </section>
      <div className="support-page__sections">
        {supportPage.sections.map(([title, content]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{content}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
