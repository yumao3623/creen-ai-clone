import type { Metadata } from "next";
import Link from "next/link";

import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "AI 创作功能",
  description: "浏览图片生成、图片生成视频与文本生成语音三条独立创作路径。",
  path: "/features",
  keywords: ["AI 创作功能", "图片生成", "图片生成视频", "文本生成语音"],
});

const features = [
  ["图片", "文本生成图片", "将提示词变为图片，并在提交前确认 Credits 报价。"],
  ["视频", "图片生成视频", "上传图片作为参考，独立创建 5 或 10 秒视频。"],
  ["语音", "文本生成语音", "把文本转换为音频，与其他模态共享任务记录。"],
] as const;

export default function FeaturesPage() {
  return (
    <main className="listing-page" id="main-content" tabIndex={-1}>
      <section className="listing-page__heading">
        <p className="eyebrow">创作功能</p>
        <h1>一个入口，三条创作路径</h1>
        <p>每种模态可以独立使用，统一保留账户、报价、任务和结算状态。</p>
      </section>
      <section className="feature-grid" aria-label="创作能力">
        {features.map(([eyebrow, title, description]) => (
          <article key={title}>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{description}</p>
            <Link href="/studio">打开创作工作区 →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
