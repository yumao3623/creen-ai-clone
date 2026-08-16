# Deployment Notes

状态：**Production Demo 已部署；R13-01 线上发布验收已通过。**

## 实际部署记录

| 项目                   | 结果                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Vercel Project         | `creen-ai/creen-ai-clone`                                                                                    |
| Production URL         | `https://creen-ai-clone.vercel.app`                                                                          |
| 运行时                 | Vercel Node.js 24.x                                                                                          |
| Production 环境变量    | 已由项目所有者在 Vercel 配置；真实值未写入本仓库或本文档。                                                   |
| Supabase Auth URL      | Site URL 与 `/auth/callback` Redirect URL 已指向 Production URL。                                            |
| Google OAuth           | 已由项目所有者登录验证，成功到达 Production `/account`。                                                     |
| Stripe Sandbox webhook | `checkout.session.completed` 已由 Stripe CLI 触发，endpoint 返回 HTTP 200。                                  |
| Public/SEO smoke       | `/create` 已重定向至 `/studio`；`/robots.txt` 和 `/sitemap.xml` 均正常返回，且 sitemap 使用 Production URL。 |
| Public route smoke     | `/features`、`/models`、`/pricing`、5 个 Landing 与 6 个 Support/Legal 页面均由项目所有者确认正常返回。      |
| Guest Generate guard   | 退出登录后，Studio 显示“登录后获取报价”、禁用 `Generate`，并跳转至 `/login?next=%2Fstudio`。                 |
| Final secret boundary  | `.env.local` 已忽略且未跟踪；未发现 server secret 使用 `NEXT_PUBLIC_` 前缀。唯一模式命中为测试 fixture。     |

Stripe CLI 测试响应为 `{"accepted":true,"ignored":true}`。这是预期结果：CLI fixture 没有本应用实际 Checkout 所需的订单元数据，因此不写入 Credits；该结果仍证明 Production endpoint 路由与 webhook 签名验证均正常。已轮换的 Stripe Signing Secret 已由项目所有者更新到 Vercel Production 并重新部署；不得记录或复用旧 secret。

本项目是 Next.js `16.3.1` Node.js 服务，不应以 static export 部署，因为认证、API Route、Webhook 与服务端集成需要 Node.js 运行时。Vercel 是合适的托管目标：没有本地路径依赖、没有自定义服务器，也没有只能在 `localhost` 运行的应用代码；`localhost` 只存在于开发 fallback 和本地 E2E。

本轮在 2026-08-16 复核的本地环境为 Node.js `24.19.0`、pnpm `11.19.0`；项目约束为 Node.js `>=20.9.0`。Vercel 使用 pnpm、Install Command `pnpm install --frozen-lockfile` 和 Build Command `pnpm build`。Production Build、30 个 Vitest 文件/69 个测试与 Chromium E2E 均通过；E2E 的 `.last-run.json` 为 `passed`。

## 发布前责任

| 项目                                  | 当前状态                                      | 所需所有者            |
| ------------------------------------- | --------------------------------------------- | --------------------- |
| 最终 HTTPS Demo URL                   | 已部署：`https://creen-ai-clone.vercel.app`   | Vercel 项目所有者     |
| `NEXT_PUBLIC_SITE_URL`                | 已配置为 Production URL                       | 部署环境所有者        |
| Supabase 项目、Auth Redirect 与数据库 | Auth URL 已配置；空库 migration replay 未执行 | Supabase 项目所有者   |
| fal webhook URL 与 token              | 已配置为 Production HTTPS 回调 URL            | fal/部署环境所有者    |
| Stripe Test webhook endpoint          | 已配置且签名验证返回 HTTP 200                 | Stripe Sandbox 所有者 |
| 独立验收账户                          | 未提供                                        | 招聘方或项目所有者    |

`R13-01` 为 **PASS**：Production 首页、全部 indexable public routes、`/create -> /studio`、`/robots.txt`、`/sitemap.xml`、Google OAuth 到 Account、未登录 Generate guard 与 Stripe webhook 均已有通过证据。

## 环境变量

所有变量均来自代码实际读取点。将它们添加到 Vercel 的 Production Environment；绝不提交真实值。

### Public

| 变量                                   | 是否必须 | 说明                                                                                      |
| -------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | 是       | 最终 Demo HTTPS URL；构建时写入 Canonical、Sitemap、Open Graph 和 OAuth/Stripe 回调来源。 |
| `NEXT_PUBLIC_SUPABASE_URL`             | 是       | Supabase 项目 HTTPS URL。                                                                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 是       | 可暴露给浏览器的 Supabase Publishable Key，受 RLS 约束。                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | 否       | 仅兼容旧 Supabase 项目；若同时存在，应用优先使用 Publishable Key。                        |

### Server Secret

| 变量                                    | 是否必须 | 说明                                                         |
| --------------------------------------- | -------- | ------------------------------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY`             | 是       | 仅供服务端 webhook、Credits 和 Stripe/fal 生命周期写入使用。 |
| `FAL_KEY`                               | 是       | fal server-only API key。                                    |
| `FAL_TEXT_TO_IMAGE_MODEL`               | 是       | 固定值 `fal-ai/flux/schnell`。                               |
| `FAL_IMAGE_TO_VIDEO_MODEL`              | 是       | 固定值 `fal-ai/kling-video/v2.1/standard/image-to-video`。   |
| `FAL_TEXT_TO_SPEECH_MODEL`              | 是       | 固定值 `fal-ai/minimax/speech-02-hd`。                       |
| `FAL_WEBHOOK_URL`                       | 是       | 最终 URL 的 `/api/webhooks/fal`；必须 HTTPS。                |
| `FAL_WEBHOOK_TOKEN`                     | 是       | 至少 32 个字符的私有回调 token。                             |
| `STRIPE_SECRET_KEY`                     | 是       | 仅 Stripe Test/Sandbox key；代码拒绝 Live Mode。             |
| `STRIPE_WEBHOOK_SECRET`                 | 是       | Stripe Test webhook 的 `whsec_...` 签名 secret。             |
| `STRIPE_SUBSCRIPTION_PRICE_ID`          | 是       | 已冻结的 Test/Sandbox subscription Price ID。                |
| `STRIPE_RECURRING_CREDIT_PACK_PRICE_ID` | 是       | 已冻结的 Test/Sandbox recurring credit-pack Price ID。       |

`SUPABASE_SERVICE_ROLE_KEY`、`FAL_KEY`、`FAL_WEBHOOK_TOKEN`、`STRIPE_SECRET_KEY` 和 `STRIPE_WEBHOOK_SECRET` 绝不能使用 `NEXT_PUBLIC_` 前缀，也绝不能加入 Git。`.env.local` 已受 `.gitignore` 保护；`.env.example` 只有占位符。

```text
NEXT_PUBLIC_SITE_URL=https://demo.example.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FAL_KEY=
FAL_TEXT_TO_IMAGE_MODEL=fal-ai/flux/schnell
FAL_IMAGE_TO_VIDEO_MODEL=fal-ai/kling-video/v2.1/standard/image-to-video
FAL_TEXT_TO_SPEECH_MODEL=fal-ai/minimax/speech-02-hd
FAL_WEBHOOK_URL=https://demo.example.com/api/webhooks/fal
FAL_WEBHOOK_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUBSCRIPTION_PRICE_ID=
STRIPE_RECURRING_CREDIT_PACK_PRICE_ID=
```

参见 `.env.example`、`docs/authentication.md`、`docs/ai-generation.md` 和 `docs/stripe.md`。Stripe 仅允许 Test/Sandbox key；应用配置会拒绝 Live Mode。

## 已完成的账号配置

1. 已创建 Vercel Project，并已将 Production 环境变量配置为本项目实际读取的变量集；`NEXT_PUBLIC_SITE_URL` 与 `FAL_WEBHOOK_URL` 均使用 Production HTTPS URL。
2. 已在 Supabase Authentication > URL Configuration 配置 Site URL 和 `/auth/callback` Redirect URL。
3. Google OAuth 继续使用 Supabase callback `https://wuhuxxyimcnkmsgskowq.supabase.co/auth/v1/callback`，并已实际完成 Production 登录。
4. 已在 Stripe Sandbox 为 `https://creen-ai-clone.vercel.app/api/webhooks/stripe` 配置所需事件、轮换 endpoint Signing Secret、更新 Vercel `STRIPE_WEBHOOK_SECRET` 并重新部署。CLI 测试 `checkout.session.completed` 的交付状态为 HTTP 200。

上述值中的 Supabase Service Role、fal Key/Token、Stripe Secret/Webhook Secret 都是 Secret。每次修改 `NEXT_PUBLIC_SITE_URL` 或任何 `NEXT_PUBLIC_*` 值后必须重新部署，因为 Next.js 会在构建时内联 Public 环境变量。

## 部署与数据库

在干净 Node.js `>=20.9.0` 与 pnpm `11.19.0` 环境执行：

```bash
pnpm install --frozen-lockfile
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

当前远端 Supabase 已包含此前验收的 migrations。本轮不得重复应用旧 migration、修改 migration history 或创建新的生产数据库。只有最终 Demo 所连接的项目经确认缺少已知 migration 时，才用该项目既有的受控迁移流程补齐。`R13-02`（空数据库完整 replay）仍是非阻塞、未执行的已知限制。

## 发布后验收

1. 验证 `/`、`/features`、`/models`、`/pricing`、Landing Page、`/studio`、Support/Legal、`/robots.txt` 与 `/sitemap.xml`；验证 `/create` 永久跳转到 `/studio`，且 Canonical/Sitemap 使用最终 HTTPS URL。
2. 验证 `/login`、`/register`、Email/Password 注册和登录、刷新、退出、Account Guard，以及 Google OAuth consent/callback/session/account。无账号权限或未完成 Google allow list 时如实记录为 `NOT EXECUTED / Requires access`。
3. 验证未登录可浏览 Studio、未登录 `POST /api/generate` 被拒绝、登录后核心 Generate 状态正确；验证 Account 的 History、Credits 和 Payment 只读视图。
4. 使用 Test Stripe 商品打开一次 Checkout，并确认 webhook endpoint 可签名验证、Return URL 正常，且只有签名 `invoice.paid` webhook 改变 Credits。
5. 仅在批准预算内，对三种 fal 模态执行最少必要的真实生成，核对 webhook、任务、Ledger 和 Account History；若不需要重测，不产生额外费用。
6. 保存发布版本、Demo URL、环境所有者、验收账号所有者和上述结果到交付记录；不要记录 Credential、Cookie、token 或真实 key。

fal 与真实 Stripe Checkout 测试会产生外部状态或成本，必须由相应账号所有者明确授权后执行。`R13-01` 已通过；`R13-02`（空 Supabase migration replay）与 `R13-03`（hosted CI、full secret/license scanner）仍为明确记录的非阻塞限制。
