# 部署说明

## Production Demo

| 项目           | 当前值                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| Vercel Project | `creen-ai/creen-ai-clone`                                              |
| Production URL | [https://creen-ai-clone.vercel.app](https://creen-ai-clone.vercel.app) |
| Runtime        | Vercel Node.js 24.x                                                    |
| Build          | `pnpm install --frozen-lockfile`、`pnpm build`                         |
| 应用形态       | Next.js Node.js Server，不能使用 static export                         |

应用需要认证、API Route、fal Webhook、Stripe Webhook 和服务端 Secret，因此必须以 Node.js Runtime 部署。`NEXT_PUBLIC_SITE_URL` 和 `FAL_WEBHOOK_URL` 使用 Production HTTPS URL。

## Supabase 与 Google Redirect

- Supabase Site URL 指向 `https://creen-ai-clone.vercel.app`；
- 应用回调地址为 `https://creen-ai-clone.vercel.app/auth/callback`；
- Google OAuth Provider Callback 使用 Supabase 地址 `https://wuhuxxyimcnkmsgskowq.supabase.co/auth/v1/callback`；
- Google Test User 已完成 Consent、Callback、Session 和 Production Account 验证；
- Service Role、Google Client Secret、Cookie 和 Token 不写入仓库。

## fal 配置边界

fal 只在服务端使用。固定模型为：

| 模态           | 环境变量                   | Model ID                                          |
| -------------- | -------------------------- | ------------------------------------------------- |
| Text-to-Image  | `FAL_TEXT_TO_IMAGE_MODEL`  | `fal-ai/flux/schnell`                             |
| Image-to-Video | `FAL_IMAGE_TO_VIDEO_MODEL` | `fal-ai/kling-video/v2.1/standard/image-to-video` |
| Text-to-Speech | `FAL_TEXT_TO_SPEECH_MODEL` | `fal-ai/minimax/speech-02-hd`                     |

`FAL_KEY`、`FAL_WEBHOOK_TOKEN` 和 `FAL_WEBHOOK_URL` 只配置在托管 Secret/环境变量中。Webhook URL 必须是 HTTPS，回调请求必须带私有 token；应用保存 Raw Body Hash 和 Receipt 以支持幂等重放。

## Stripe Sandbox Webhook

Stripe 使用 Test/Sandbox key，Webhook endpoint 为：

`https://creen-ai-clone.vercel.app/api/webhooks/stripe`

允许的服务端商品为 `subscription` 和 `recurring_credit_pack`。两个 Price ID 必须不同、处于 Test Mode、为 active recurring USD Price，并提供正整数 `credits` metadata。Webhook 使用 Raw Body、`stripe-signature` 和 `STRIPE_WEBHOOK_SECRET` 验证；Checkout Return 不修改 Credits。Production endpoint 的签名交付 smoke 返回 HTTP 200。

## 环境变量

### Public

| 变量                                   | 说明                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Production HTTPS URL；用于 Canonical、Sitemap、OAuth 和 Stripe Return URL |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase 项目 URL                                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 可公开的 Supabase Publishable Key                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | 旧项目兼容变量，可选                                                      |

### Server-only

| 变量                                    | 说明                                |
| --------------------------------------- | ----------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`             | Webhook、Credits 和服务端数据库操作 |
| `FAL_KEY`                               | fal API Key                         |
| `FAL_TEXT_TO_IMAGE_MODEL`               | 固定 Image 模型 ID                  |
| `FAL_IMAGE_TO_VIDEO_MODEL`              | 固定 Video 模型 ID                  |
| `FAL_TEXT_TO_SPEECH_MODEL`              | 固定 Audio 模型 ID                  |
| `FAL_WEBHOOK_URL`                       | `/api/webhooks/fal` 的 HTTPS 地址   |
| `FAL_WEBHOOK_TOKEN`                     | 私有回调 token，至少 32 个字符      |
| `STRIPE_SECRET_KEY`                     | Stripe Test Mode Secret Key         |
| `STRIPE_WEBHOOK_SECRET`                 | Stripe Test Webhook Signing Secret  |
| `STRIPE_SUBSCRIPTION_PRICE_ID`          | Subscription Test Price             |
| `STRIPE_RECURRING_CREDIT_PACK_PRICE_ID` | recurring Credit Pack Test Price    |

真实值只放 `.env.local` 或 Vercel Secret Store；`.env.example` 只保存变量名和占位说明。任何 Secret 都不能使用 `NEXT_PUBLIC_` 前缀。

## 发布后 Smoke Test

已验证：

- Home、Features、Models、Pricing、代表性 Landing、Support/Legal、Studio 返回正常；
- `/create` 重定向到 `/studio`；`/robots.txt` 和 `/sitemap.xml` 使用 Production URL；
- `/account` 要求会话；退出登录后 Studio 的 Generate Guard 跳转到 Login；
- Google OAuth 成功进入 Production Account；
- Stripe Sandbox 签名 Webhook endpoint 返回 HTTP 200；
- Production Build、Vitest 和 Chromium E2E 通过。

真实 fal 生成、真实 Stripe Checkout 和数据库 Credits 对账已有脱敏记录，见 [测试矩阵](test-cases.md) 与 [真实集成证据](real-integration)。

## 已知发布限制

- Stripe Live Mode 未授权，Production 只允许 Sandbox/Test；
- 目标远端数据库已有迁移应用记录，空 Supabase 数据库的完整回放尚未执行；
- Hosted CI 尚未触发，完整 secret/license scanner 尚未配置或执行；
- fal 输出 URL 的长期归档未作为额外存储服务实现；
- 发布验收不记录 Credential、Cookie、Checkout Session URL 或 Signing Secret。
