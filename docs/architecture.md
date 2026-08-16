# 系统架构

## 总体形态

项目是运行在 Vercel Node.js Runtime 上的 Next.js + TypeScript 模块化单体。浏览器访问公开 Server-rendered 页面或受保护页面；需要认证的命令进入 Route Handler，再由 Domain、Repository 和第三方 Adapter 完成工作。

```text
Browser
  |-- Public pages, Studio, Auth, Account
  |-- Quote / Generate / Upload / Checkout commands
  |-- Stripe Hosted Checkout redirect
        |
Next.js App Router
  |-- page/layout, Metadata, robots, sitemap
  |-- Auth boundary and Route Handlers
  |-- Domain rules: generation, credits, auth
  |-- Repositories and integrations
        |-- Supabase Auth + PostgreSQL + RLS
        |-- fal.ai Queue + Webhook
        `-- Stripe Sandbox + Webhook
```

## 技术组件

- Next.js 16 App Router、React 19、严格 TypeScript；
- Supabase Auth 提供 Email/Password、Google OAuth 和 Cookie Session；PostgreSQL、RLS 与事务 RPC 保存业务数据；
- fal.ai 官方 Queue Adapter 负责 Text-to-Image、Image-to-Video、Text-to-Speech；
- Stripe SDK 负责 Test Price 校验、Hosted Checkout、Raw Body Signature Verification 和事件映射；
- Next Metadata API、`robots.ts`、`sitemap.ts` 和类型化内容负责 SEO；
- Vercel 提供 Production Node.js 部署。

## 代码边界

```text
src/
  app/             页面、布局、Metadata、Route Handler
  components/      Header、Footer、Marketing 与通用 UI
  config/          环境变量和站点配置
  content/         Marketing、Support、Model 内容
  db/              Repository、数据库访问、Migration Contract
  domain/          Auth、Generation、Credits 规则
  features/        Studio、Auth、Account、Billing 组合
  integrations/    Supabase、fal、Stripe Adapter
  lib/              SEO 与共享工具
supabase/migrations 数据表、RLS、触发器和事务 RPC
tests/             Playwright E2E
```

Route Handler 只做输入解析、认证和命令编排。余额算术、状态转换、Webhook 映射和第三方 SDK 细节分别位于 Domain、Repository 和 Integration 层。

## Generation Lifecycle

Generation 从 `draft` 经 `quoted`、`reserving`、`queued`、`processing` 进入 `succeeded`，也可进入 `failed`、`canceled`、`expired` 或 `reconciliation_required`。Quote 与输入参数和不可变价格版本绑定。

提交时服务端校验模态、模型和参数，在一个数据库事务中完成所有权检查、余额检查、任务创建、Credits Reservation、幂等记录和 Outbox 记录。fal Queue 返回 External Task ID 后持久化；Webhook 通过高熵 URL token、Raw Body SHA-256 Receipt 和唯一约束完成回调幂等。Provider 状态未知时进入对账状态，不伪造结果。

## Credits

Credits 使用整数最小单位。当前报价规则为：Text-to-Image 30 Credits；Image-to-Video 5 秒 2,800 Credits、10 秒 5,600 Credits；Text-to-Speech 每 10 个字符 6 Credits，至少收取一组。系统按 Quote 做 Reserve，成功做 Settle，失败或取消做 Compensation，并写入不可变 Ledger。Subscription Lot 优先于 recurring Pack Lot；重复提交只返回既有任务。

## Stripe

服务端只允许 `subscription` 和 `recurring_credit_pack` 两个 Test Price，并从 Stripe metadata 读取每期 Credits。Checkout 使用本地 Payment Command 和 Stripe Idempotency Key。Webhook 校验 Raw Body 与签名，按事件创建时间和幂等记录处理 Checkout、Invoice、Subscription 状态；Credits 仅由可信 `invoice.paid` 事件发放。重复或乱序事件不会重复发放或回退较新的状态，Return URL 只读取状态。

## 数据模型

| 数据                                                                      | 用途                                                            |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `profiles`                                                                | Auth User、展示信息和 Stripe Customer 引用                      |
| `generation_tasks`                                                        | 用户、模态、模型、标准化输入、状态、Quote、Provider/Result 引用 |
| `provider_attempts`、`provider_webhook_events`                            | 外部任务、回调 Receipt、Hash、重放和成本证据                    |
| `price_versions`、`model_prices`、`quotes`                                | 版本化报价与参数 Hash                                           |
| `credit_accounts`、`credit_lots`、`credit_reservations`、`ledger_entries` | 余额、来源 Lot、预留、结算、补偿和审计账本                      |
| `payments`、`subscriptions`、`stripe_events`                              | Checkout、订阅、支付事件及可信状态                              |
| `idempotency_records`、`outbox_events`                                    | Durable Command Result 与可靠异步工作                           |

所有业务行按 Auth User 做所有权隔离；Provider External ID、Stripe Event ID、Invoice ID 和幂等键有唯一性约束。

## SEO

公开页面使用独立 Metadata、Canonical、Open Graph、单一 H1 和类型化内容。Sitemap 只包含 Home、Features、Models、Pricing、代表性 Landing 和 Support/Legal 页面；Account、Auth Callback、Checkout Return、Studio 和 API 不索引。Organization 与 WebSite JSON-LD 与可见站点内容一致。

## Security 与 Secret

公开 Supabase URL/Publishable Key 可使用 `NEXT_PUBLIC_` 前缀。Supabase Service Role、fal Key、fal Webhook Token、Stripe Secret 和 Stripe Webhook Secret 只在 Server-only 代码和托管 Secret Store 中使用。OAuth Redirect、Cookie Session、Webhook Signature、Input Validation、RLS 和日志脱敏共同构成边界。生产路径不使用 Mock/Stub 结果。

## 质量分层

Unit 覆盖价格、输入、状态转换和错误映射；Database/Integration 覆盖 RLS、事务、并发和幂等；Contract 覆盖 fal/Stripe Payload 与签名；E2E 覆盖 Auth、Studio、SEO、Payment 和 Account；Real Integration 单独记录 Google、fal 和 Stripe Sandbox 证据。
