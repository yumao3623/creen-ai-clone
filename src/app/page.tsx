import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { GenerateControl } from "@/features/studio/generate-control";
import { HomeInspirationGallery } from "@/components/home-inspiration-gallery";
import { getAuthenticatedUser } from "@/integrations/supabase/server";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "统一 AI 图片、视频与语音创作工作区",
  description:
    "在统一工作区中创建图片、视频与语音，并在生成前查看可信的 Credits 报价。",
  path: "/",
  keywords: ["AI 创作工作区", "AI 图片生成", "AI 视频生成", "AI 语音生成"],
});

const capabilities = [
  {
    eyebrow: "图片",
    title: "文本生成图片",
    description: "通过文字提示生成图片，在提交前确认可信 Credits 报价。",
    accent: "violet",
    image: "/media/phase11-gallery-sunrise-landscape.jpg",
  },
  {
    eyebrow: "视频",
    title: "图片生成视频",
    description: "上传图片作为参考，独立生成短视频。",
    accent: "blue",
    image: "/media/phase11-gallery-animal.jpg",
  },
  {
    eyebrow: "语音",
    title: "文本生成语音",
    description: "将文本转换为语音，并与另外两种模态共用 Credits 与历史记录。",
    accent: "coral",
    image: "/media/phase11-gallery-fashion.jpg",
  },
] as const;

const workflowSteps = [
  [
    "01",
    "选择创作模式",
    "在图片、视频或语音之间切换；每种模式保留独立输入与参数。",
  ],
  ["02", "准备你的输入", "描述画面、上传视频参考图，或输入需要朗读的文本。"],
  [
    "03",
    "确认 Quote 后提交",
    "登录后获得服务端报价；余额充足时才会把真实任务提交到服务提供方。",
  ],
] as const;

const productFacts = [
  ["3", "已接入创作模态"],
  ["15 分钟", "版本化 Quote 有效期"],
  ["1", "统一 Credits 账本"],
] as const;

const modelGroups = [
  ["图片", "fal-ai/flux/schnell"],
  ["视频", "fal-ai/kling-video/v2.1/standard/image-to-video"],
  ["语音", "fal-ai/minimax/speech-02-hd"],
] as const;

const faqItems = [
  [
    "什么时候需要登录？",
    "你可以浏览创作工作区和填写输入；获取可信报价、上传参考图和提交真实生成前需要登录。",
  ],
  [
    "Credits 何时扣除？",
    "服务端创建 Quote 后，任务会先预留 Credits。成功时结算，失败时按状态机补偿。",
  ],
  [
    "付款完成后会立即增加余额吗？",
    "不会。Stripe Sandbox 的余额变更只来自已验证签名的 Webhook，不以浏览器返回页为准。",
  ],
  [
    "目前可以创作哪些内容？",
    "当前工作区支持文本生成图片、图片生成视频和文本生成语音；各模式使用独立输入，并共享同一账户与 Credits 账本。",
  ],
  [
    "为什么要先获取 Quote？",
    "Quote 由服务端根据当前模式和参数生成，用于在提交前确认本次 Credits 成本与有效期。",
  ],
  [
    "生成完成后在哪里查看结果？",
    "任务会异步处理。提交后可在账户页的最近任务和历史记录中查看可信状态。",
  ],
  [
    "可以使用 Google 登录吗？",
    "可以。除邮箱和密码外，当前项目也提供 Google 登录入口；实际可用性取决于已配置的 OAuth 环境。",
  ],
  [
    "游客可以直接生成吗？",
    "游客可以浏览、切换模式和填写输入；获取可信 Quote、上传视频参考图及提交真实生成前需要登录。",
  ],
  [
    "生成失败会怎样处理？",
    "任务状态和 Credits 由服务端状态机记录；失败场景按既有补偿规则处理，并以账户账本中的可信记录为准。",
  ],
] as const;

const useCases = [
  ["产品概念图", "将产品卖点转成可讨论的第一版视觉方向。", "文本生成图片"],
  ["社交媒体视觉", "用同一个视觉提示快速准备一组内容素材。", "文本生成图片"],
  ["封面动效", "上传封面图并描述镜头运动，生成短视频片段。", "图片生成视频"],
  ["课程配图", "把抽象主题变成更易理解的图像草稿。", "文本生成图片"],
  ["旁白草稿", "输入文案并生成用于审核的语音版本。", "文本生成语音"],
  ["旅程开场", "以一张旅行照片为参考，制作简短的动态片头。", "图片生成视频"],
] as const;

export default async function HomePage() {
  const { user } = await getAuthenticatedUser();

  return (
    <main className="home-page" id="main-content" tabIndex={-1}>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__content">
          <h1 id="hero-title">
            Creen AI：一个工作区，完成图片、视频与音频创作
          </h1>
        </div>
      </section>

      <section className="home-creator" aria-label="快速创作">
        <GenerateControl authenticated={Boolean(user)} />
      </section>

      <HomeInspirationGallery />

      <section
        className="home-introduction"
        aria-labelledby="capabilities-title"
      >
        <div className="section-heading">
          <p className="eyebrow">多模态工作区</p>
          <h2 id="capabilities-title">什么是 Creen？</h2>
          <p>
            一个统一的创作工作区，将图片、视频与语音放在同一账户中，并保留报价、
            任务与 Credits 状态。
          </p>
        </div>

        <div className="capability-grid capability-grid--media">
          {capabilities.map((capability) => (
            <article
              className={`capability-card capability-card--${capability.accent}`}
              key={capability.title}
            >
              <span>{capability.eyebrow}</span>
              <Image
                alt=""
                aria-hidden="true"
                className="capability-card__media"
                fill
                loading="eager"
                sizes="(max-width: 48rem) calc(100vw - 2rem), 33vw"
                src={capability.image}
              />
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
              {capability.accent === "coral" ? (
                <audio
                  aria-label="试听 Creen 语音样本"
                  className="capability-card__audio"
                  controls
                  preload="metadata"
                >
                  <source src="/media/phase11-studio.mp3" type="audio/mpeg" />
                </audio>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="home-workflow" aria-labelledby="workflow-title">
        <div className="section-heading">
          <p className="eyebrow">创作流程</p>
          <h2 id="workflow-title">如何开始创作</h2>
          <p>从创作输入到异步任务，关键状态由服务端与账户记录共同确认。</p>
        </div>
        <ol>
          {workflowSteps.map(([number, title, description]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-facts" aria-label="产品能力概览">
        {productFacts.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="home-use-cases" aria-labelledby="use-cases-title">
        <div className="section-heading">
          <p className="eyebrow">适用场景</p>
          <h2 id="use-cases-title">用已接入的能力完成日常创作</h2>
          <p>以下是当前三种创作模式可直接覆盖的典型工作流。</p>
        </div>
        <div>
          {useCases.map(([title, description, mode], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{mode}</p>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link href="/studio">开始创作</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-models" aria-labelledby="models-title">
        <div className="section-heading">
          <p className="eyebrow">模型矩阵</p>
          <h2 id="models-title">当前接入的生成模型</h2>
          <p>模型由服务端固定配置，浏览器不会接触 Provider Key。</p>
        </div>
        <div>
          {modelGroups.map(([modality, model]) => (
            <article key={modality}>
              <span>{modality}</span>
              <strong>{model}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="home-faq" aria-labelledby="faq-title">
        <div className="section-heading">
          <p className="eyebrow">常见问题</p>
          <h2 id="faq-title">常见问题</h2>
        </div>
        <div>
          {faqItems.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
