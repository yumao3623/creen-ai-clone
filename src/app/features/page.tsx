import type { Metadata } from "next";
import Link from "next/link";

import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "AI 创作功能",
  description:
    "浏览 Text to Image、Image to Video 与 Text to Speech 三条独立创作路径。",
  path: "/features",
  keywords: [
    "AI 创作功能",
    "Text to Image",
    "Image to Video",
    "Text to Speech",
  ],
});

const features = [
  ["Image", "Text to Image", "将提示词变为图片，并在提交前确认 Credits 报价。"],
  ["Video", "Image to Video", "上传图片作为参考，独立创建 5 或 10 秒视频。"],
  ["Audio", "Text to Speech", "把文本转换为音频，与其他模态共享 History。"],
] as const;

export default function FeaturesPage() {
  return (
    <main className="listing-page" id="main-content" tabIndex={-1}>
      <section className="listing-page__heading">
        <p className="eyebrow">FEATURES</p>
        <h1>一个入口，三条创作路径</h1>
        <p>每种模态可以独立使用，统一保留账户、报价、任务和结算状态。</p>
      </section>
      <section className="feature-grid" aria-label="创作能力">
        {features.map(([eyebrow, title, description]) => (
          <article key={title}>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{description}</p>
            <Link href="/studio">打开 Studio →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
