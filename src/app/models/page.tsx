import type { Metadata } from "next";

import { modelContent } from "@/content/models";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "支持的 AI 创作模型",
  description: "查看 Creen 为图片、视频和语音工作流固定的服务端模型契约。",
  path: "/models",
  keywords: ["AI 创作模型", "图片生成模型", "视频生成模型", "语音生成模型"],
});

export default function ModelsPage() {
  return (
    <main className="listing-page" id="main-content" tabIndex={-1}>
      <section className="listing-page__heading">
        <p className="eyebrow">MODELS</p>
        <h1>为三种创作模态选择固定模型</h1>
        <p>模型选择和参数契约由服务端验证，浏览器不提交模型标识或价格。</p>
      </section>
      <section className="model-table" aria-label="支持的模型">
        {modelContent.map(({ modality, model, purpose, description }) => (
          <article key={model}>
            <p>{modality}</p>
            <code>{model}</code>
            <span>{purpose}</span>
            <p>{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
