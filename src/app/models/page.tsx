import type { Metadata } from "next";

import { generationModels } from "@/domain/generation/model-registry";
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
        <p className="eyebrow">模型</p>
        <h1>为三种创作模态选择已验收模型</h1>
        <p>
          Studio 只显示与当前输入兼容且已完成真实 Provider
          验收的模型；价格由服务端 Quote 决定。
        </p>
      </section>
      <section className="model-table" aria-label="支持的模型">
        {generationModels
          .filter((model) => model.status === "verified")
          .map((model) => (
            <article key={model.key}>
              <p>{modalityLabel(model.modality)}</p>
              <code>{model.key}</code>
              <span>{model.label}</span>
              <p>{model.description}</p>
            </article>
          ))}
      </section>
    </main>
  );
}

function modalityLabel(modality: string) {
  switch (modality) {
    case "text_to_image":
      return "文本生成图片";
    case "image_to_video":
      return "图片生成视频";
    case "text_to_speech":
      return "文本生成语音";
    default:
      return modality;
  }
}
