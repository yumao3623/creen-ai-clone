# Creen.ai Clone

一个统一的 AI 创作工作区复刻项目。项目实现邮箱密码注册与登录、Google OAuth、Text-to-Image、Image-to-Video、Text-to-Speech 三种真实生成能力、可审计的 Credits 计费，以及 Stripe Sandbox 支付闭环。

在线 Demo：[https://creen-ai-clone.vercel.app](https://creen-ai-clone.vercel.app)

## 核心功能

- 邮箱密码注册、登录、会话保持、退出登录和受保护账户页面；
- 真实 Google OAuth 登录及 `/auth/callback` 回调；
- 统一 Studio：`Text-to-Image`、`Image-to-Video`、`Text-to-Speech` 三个独立创作模式，支持按模态选择可用模型和真实图片参考图能力；
- 提交前可信 Credits Quote，余额检查、预留、结算、失败补偿和不可变 Ledger；
- 任务异步队列、Webhook 回调、重复回调幂等处理，以及 Studio 和 Account 中的真实结果查看；
- Stripe Hosted Checkout Sandbox，Subscription 与 recurring Credit Pack 两类商品；
- Home、Features、Models、Pricing、五个搜索意图 Landing Page、FAQ、About、Contact 与法律页面；
- 路由级 Metadata、Canonical、JSON-LD、`robots.txt`、`sitemap.xml` 和私有页面 `noindex`。

## 技术栈

| 领域       | 实现                                           |
| ---------- | ---------------------------------------------- |
| Web        | Next.js 16 App Router、React 19、TypeScript    |
| 身份与数据 | Supabase Auth、PostgreSQL、RLS、事务 RPC       |
| AI         | fal.ai Queue API 与服务端 Webhook              |
| 支付       | Stripe Hosted Checkout Sandbox 与签名 Webhook  |
| 质量       | ESLint、Prettier、Vitest、Playwright、axe-core |
| 部署       | Vercel Node.js Runtime                         |

## 真实第三方集成

- Supabase：Email/Password、Google OAuth、受保护资源和 Credits 数据；
- fal.ai：`fal-ai/flux/schnell`、`fal-ai/flux/dev`、`fal-ai/flux/dev/image-to-image`、`fal-ai/kling-video/v2.1/standard/image-to-video`、`fal-ai/kling-video/v3/standard/image-to-video`、`fal-ai/minimax/speech-02-hd`、`fal-ai/minimax/speech-2.8-turbo`；
- Stripe：Test/Sandbox Subscription 与 recurring Credit Pack。Credits 仅由签名验证后的可信支付事件发放；
- Vercel：Production URL、公开页面、SEO 端点、Google OAuth 与 Stripe Webhook 均已部署并可用。

## 测试摘要

交付版本已完成真实邮箱密码与 Google 登录、三种 fal 生成、Credits 结算、Stripe Sandbox Checkout、公开页面与 SEO、键盘可访问性、生产构建、Chromium E2E，以及 GitHub Actions Quality Gate 验证。完整测试矩阵和真实集成记录见 [docs/test-cases.md](docs/test-cases.md) 与 [docs/real-integration](docs/real-integration)。

## 项目结构

```text
src/
  app/            页面、Route Handlers、Metadata、SEO 端点
  components/     通用页面与导航组件
  config/         站点与环境变量校验
  content/        Landing、Support、Model 的类型化内容
  db/             Supabase Repository 与数据库契约测试
  domain/         Auth、Generation、Credits 业务规则
  features/       Studio、Auth、Account、Billing UI
  integrations/   Supabase、fal、Stripe 适配器
supabase/
  migrations/     数据模型与事务 RPC
tests/            Playwright 浏览器测试
docs/             交付文档、过程记录与证据
```

## 文档导航

正式交付资料：

- [产品需求](docs/PRD.md)
- [交互与视觉设计](docs/design.md)
- [系统架构](docs/architecture.md)
- [测试矩阵](docs/test-cases.md)
- [部署说明](docs/deployment-notes.md)

过程记录与证据：

- [调研](docs/research.md)、[决策记录](docs/decisions.md)、[实施计划](docs/implementation-plan.md)、[开发日志](docs/development-log.md)
- [证据索引](docs/evidence-index.md)、[真实集成证据](docs/real-integration)、[过程验收记录](docs/development-log.md)
- [认证](docs/authentication.md)、[数据库](docs/database.md)、[AI 生成](docs/ai-generation.md)、[Credits](docs/credits.md)、[Stripe](docs/stripe.md)

## 本地运行

要求 Node.js `>=20.9.0` 与 pnpm `11.19.0`。

```bash
pnpm install
pnpm dev
```

质量检查：

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

环境变量与部署配置见 [.env.example](.env.example) 和 [部署说明](docs/deployment-notes.md)。真实凭据只能放在 `.env.local` 或托管 Secret Store。

## Demo 说明

- 支付流程当前使用 Stripe Sandbox/Test 环境，适合演示与联调，不会产生生产环境扣款；
- 主要页面与交互基于现有 Creen 参考资料完成；
- 部分生成媒体使用 fal.ai 提供的托管 URL，当前 Demo 未额外提供长期媒体归档服务。
