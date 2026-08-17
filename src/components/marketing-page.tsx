import Link from "next/link";
import Image from "next/image";

import type { MarketingPage } from "@/content/marketing";
import { absoluteUrl, serializeJsonLd } from "@/lib/seo";

const galleryMedia = [
  "/media/phase11-gallery-sunrise-landscape.jpg",
  "/media/phase11-gallery-animal.jpg",
  "/media/phase11-gallery-fashion.jpg",
  "/media/phase11-gallery-landscape.jpg",
  "/media/phase11-gallery-portrait.jpg",
  "/media/phase11-gallery-still-life.jpg",
] as const;

export function MarketingPageTemplate({ page }: { page: MarketingPage }) {
  const structuredData = serializeJsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: page.seo.title,
        description: page.seo.description,
        url: absoluteUrl(`/${page.slug}`),
        inLanguage: "zh-CN",
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
    ],
  });

  return (
    <main className="marketing-page" id="main-content" tabIndex={-1}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />
      <section className="marketing-hero" aria-labelledby="marketing-title">
        <div className="marketing-hero__content">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1 id="marketing-title">{page.title}</h1>
          <p>{page.description}</p>
        </div>
      </section>
      <Link className="marketing-creator-preview" href="/studio">
        <span className="marketing-creator-preview__tabs" aria-hidden="true">
          <span>图片</span>
          <span>视频</span>
          <span>音频</span>
        </span>
        <span className="marketing-creator-preview__prompt">
          进入创作工作区，开始 {capabilityLabel(page.capability)} 创作
        </span>
        <span className="marketing-creator-preview__footer">
          <span>在提交前确认 Credits Quote</span>
          <strong>开始创作</strong>
        </span>
      </Link>
      <section
        className="marketing-gallery"
        aria-label={`${page.capability} 示例媒体`}
      >
        {galleryMedia.map((src, index) => (
          <div
            className={`marketing-gallery__item marketing-gallery__item--${index + 1}`}
            key={src}
          >
            <Image
              alt={`${page.capability} 示例`}
              fill
              loading="eager"
              sizes="(max-width: 48rem) 72vw, 29vw"
              src={src}
            />
          </div>
        ))}
      </section>
      <section
        className="marketing-details"
        aria-label={`${page.capability} 工作流`}
      >
        <div>
          <p className="eyebrow">创作流程</p>
          <h2>{capabilityLabel(page.capability)}</h2>
        </div>
        <ol>
          {page.steps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
      <section className="marketing-details" aria-labelledby="faq-title">
        <div>
          <p className="eyebrow">常见问题</p>
          <h2 id="faq-title">常见问题</h2>
        </div>
        <dl>
          {page.faq.map(({ question, answer }) => (
            <div key={question}>
              <dt>{question}</dt>
              <dd>{answer}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="marketing-related" aria-labelledby="related-title">
        <p className="eyebrow">继续探索</p>
        <h2 id="related-title">相邻创作路径</h2>
        <div>
          {page.related.map((item) => (
            <Link className="link-card" href={item.href} key={item.href}>
              {item.label}
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function capabilityLabel(capability: MarketingPage["capability"]) {
  switch (capability) {
    case "Text to Image":
      return "文本生成图片";
    case "Image to Video":
      return "图片生成视频";
    case "Text to Speech":
      return "文本生成语音";
    default:
      return capability;
  }
}
