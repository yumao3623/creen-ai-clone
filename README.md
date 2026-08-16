# Creen.ai Clone

一个统一的 AI 创作工作区复刻项目。项目实现邮箱密码注册与登录、Google OAuth、Text-to-Image、Image-to-Video、Text-to-Speech 三种真实生成能力、可审计的 Credits 计费，以及 Stripe Sandbox 支付闭环。

在线 Demo：[https://creen-ai-clone.vercel.app](https://creen-ai-clone.vercel.app)

## 核心功能

- 邮箱密码注册、登录、会话保持、退出登录和受保护账户页面；
- 真实 Google OAuth 登录及 `/auth/callback` 回调；
- 统一 Studio：`Text-to-Image`、`Image-to-Video`、`Text-to-Speech` 三个独立创作模式；
- 提交前可信 Credits Quote，余额检查、预留、结算、失败补偿和不可变 Ledger；
- 任务异步队列、Webhook 回调、重复回调幂等处理和任务历史；
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
- fal.ai：`fal-ai/flux/schnell`、`fal-ai/kling-video/v2.1/standard/image-to-video`、`fal-ai/minimax/speech-02-hd`；
- Stripe：Test/Sandbox Subscription 与 recurring Credit Pack。Credits 仅由签名验证后的可信支付事件发放；
- Vercel：Production URL、公开页面、SEO 端点、Google OAuth 与 Stripe Webhook 均已完成线上 smoke 验收。

## 测试摘要

已通过的验证包括：真实邮箱密码与 Google 登录、三种 fal 生成、Credits 并发/结算/补偿、Stripe Sandbox Checkout 与 Webhook 重放、公开路由与 SEO、键盘可访问性、生产构建和 Chromium E2E。

当前没有记录为 `FAIL` 的正式测试项。空 Supabase 数据库完整 migration replay、托管 CI 触发，以及完整 secret/license 扫描仍为 `NOT EXECUTED`。详细矩阵见 [docs/test-cases.md](docs/test-cases.md)，脱敏真实集成证据见 [docs/real-integration](docs/real-integration)。

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

变量名与安全边界见 [.env.example](.env.example) 和 [部署说明](docs/deployment-notes.md)。真实凭据只能放在 `.env.local` 或托管 Secret Store。

## 已知限制

- Stripe 仅使用 Sandbox/Test，不使用或声明 Stripe Live Mode；
- 源站视觉审阅基于已提供的参考截图和本地验收，不主张未取得的线上逐像素比较；
- fal 输出 URL 的长期保留策略未扩展为独立媒体归档能力；
- 空数据库 migration replay、托管 CI 与完整 secret/license 扫描尚未执行。
