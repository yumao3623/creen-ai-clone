import type { Metadata } from "next";
import Link from "next/link";

import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "AI 创作 Credits 价格",
  description:
    "查看图片、视频和语音工作流的冻结 Credits 价格基准与可信报价方式。",
  path: "/pricing",
  keywords: ["AI Credits 价格", "图片生成价格", "视频生成价格", "语音生成价格"],
});

const prices = [
  ["文本生成图片", "30 Credits", "每次生成"],
  ["图片生成视频", "2,800 / 5,600 Credits", "5 秒 / 10 秒"],
  ["文本生成语音", "6 Credits", "每 10 个字符"],
] as const;

export default function PricingPage() {
  return (
    <main className="pricing-page" id="main-content" tabIndex={-1}>
      <section className="listing-page__heading">
        <p className="eyebrow">Credits</p>
        <h1>透明的 Credits 定价</h1>
        <p>
          实际提交使用服务端创建的版本化 Quote。这里展示的是当前冻结价格基准。
        </p>
      </section>
      <section className="pricing-grid" aria-label="Credits 价格">
        {prices.map(([modality, price, detail]) => (
          <article key={modality}>
            <p>{modality}</p>
            <strong>{price}</strong>
            <span>{detail}</span>
          </article>
        ))}
      </section>
      <section className="pricing-note">
        <h2>需要补充 Credits？</h2>
        <p>
          登录后可在账户页进入 Stripe Sandbox 托管结账页。付款返回页只展示状态，
          不直接改变余额。
        </p>
        <Link className="button button--primary" href="/account">
          查看账户
        </Link>
      </section>
    </main>
  );
}
