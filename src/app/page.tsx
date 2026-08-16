import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { GenerateControl } from "@/features/studio/generate-control";
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
    eyebrow: "IMAGE",
    title: "Text → Image",
    description: "通过文本 Prompt 生成图片，在提交前确认可信 Credits 报价。",
    accent: "violet",
    image: "/media/phase11-gallery-sunrise-landscape.jpg",
  },
  {
    eyebrow: "VIDEO",
    title: "Image → Video",
    description: "上传图片作为参考，独立生成短视频。",
    accent: "blue",
    image: "/media/phase11-gallery-animal.jpg",
  },
  {
    eyebrow: "AUDIO",
    title: "Text → Speech",
    description: "将文本转换为语音，并与另外两种模态共用 Credits 与 History。",
    accent: "coral",
    image: "/media/phase11-gallery-fashion.jpg",
  },
] as const;

export default async function HomePage() {
  const { user } = await getAuthenticatedUser();

  return (
    <main className="home-page" id="main-content" tabIndex={-1}>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="eyebrow">UNIFIED AI STUDIO</p>
          <h1 id="hero-title">一个工作区，完成图片、视频与音频创作</h1>
          <p className="hero__copy">
            在同一个工作区中完成图片、视频与语音创作。每次生成在服务端确认登录、
            模型输入和 Credits 报价。
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" href="/studio">
              进入 Studio
            </Link>
            <Link className="button button--secondary" href="/pricing">
              查看 Credits
            </Link>
          </div>
        </div>
      </section>

      <section className="home-creator" aria-label="快速创作">
        <GenerateControl authenticated={Boolean(user)} />
      </section>

      <section
        className="capabilities"
        id="capabilities"
        aria-labelledby="capabilities-title"
      >
        <div className="section-heading">
          <p className="eyebrow">CANDIDATE M</p>
          <h2 id="capabilities-title">三种代表性真实能力</h2>
          <p>三种能力独立使用，共享用户、任务、Credits 与历史记录。</p>
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

      <section
        className="foundation-status"
        id="foundation-status"
        aria-labelledby="foundation-title"
      >
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h2 id="foundation-title">建立在可信状态之上的创作</h2>
        </div>
        <ul>
          <li>登录后获取版本化 Credits Quote</li>
          <li>三种模态独立提交，统一记录任务</li>
          <li>账户中查看余额、账本和支付状态</li>
        </ul>
      </section>
    </main>
  );
}
