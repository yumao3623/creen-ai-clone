# 架构方案

状态：**Candidate M 与技术主路径已确认；模型、存储和部署细节仍有 TBD**  
日期：**2026-08-14**

## 1. 架构驱动因素

- P0 要求真实 Email/Password Auth、Google OAuth、fal 和 Stripe Sandbox 集成。
- Image/Video/Audio 任务可能长时间异步执行。
- Credits 在重试、并发、Provider 失败和重复 Callback 下必须保持正确。
- 公开路由需要服务端可读内容和 Route-specific SEO。
- 采用成熟 TypeScript 工程方案，但不拆分不必要的服务。
- 隔离测试中的 Stub/Fake 必须与真实 Sandbox/Integration 验收分开。

## 2. 已选技术主路径

| 层              | 选择                            | 状态                                       |
| --------------- | ------------------------------- | ------------------------------------------ |
| Web             | Next.js App Router + TypeScript | `Accepted`                                 |
| 形态            | 模块化单体                      | `Accepted`                                 |
| Auth / Database | Supabase Auth + PostgreSQL      | `Accepted`                                 |
| AI              | fal，三个模态各一个模型         | `Accepted with model verification pending` |
| Payment         | Stripe Hosted Checkout Sandbox  | `Accepted`                                 |
| Media Storage   | 必要时 Supabase Storage         | `TBD`                                      |
| Deployment      | Vercel + Supabase 为候选        | `TBD`                                      |

不建立多 Provider 系统。保持清晰 Adapter 边界是为了隔离第三方细节和便于测试，不代表本阶段增加第二 Provider。

## 3. 系统形态

```text
Browser
  ├─ public SSR/SSG pages
  ├─ Studio：游客可探索，Generate 前 Auth Gate
  ├─ authenticated Account / History / Credits
  └─ Stripe Hosted Checkout redirect
        │
Next.js TypeScript Application
  ├─ App Router / Layout / Metadata
  ├─ Auth Boundary
  ├─ Generation Commands / Queries
  ├─ Credits Domain Service
  ├─ Stripe Checkout + Webhook Handler
  ├─ fal Adapter + Webhook / Reconciliation
  └─ Server-only Repositories
        │
Supabase Auth + PostgreSQL ── optional Supabase Storage
        │
fal Queue / Webhook       Stripe Sandbox       Google OAuth
```

fal 承担长耗时推理。Web App 提交 Job、持久化状态，再通过 Webhook 或有界 Reconciliation 更新结果；Video Generation 不保持一个长时间 HTTP Request。

## 4. 项目模块边界

```text
src/
  app/                    routes、layouts、metadata、thin handlers
  features/               页面级 Feature Composition
  components/             UI Primitives 与 Product Components
  domain/
    auth/                 应用授权策略
    generation/           Task State Machine 与 Modality Contracts
    credits/              Quote、Reservation、Ledger、Settlement
    payments/             Payment Domain Mapping
  integrations/
    supabase/             Auth / Database / optional Storage
    fal/                  Provider Adapter
    stripe/               SDK、Signature Verification、Event Mapping
  db/                     Schema、Migrations、Repositories
  content/                经批准的 Landing/Model Typed Content
  config/                 Server/Client Environment Validation
tests/
  unit/ integration/ contract/ e2e/ real-integration/
```

Route Handler 只负责输入校验、授权和调用 Domain Service，不在路由内实现 Ledger 算术或 fal/Stripe 状态映射。

## 5. 核心数据模型

以下为概念模型，字段名将在 Database 阶段通过 Migration 冻结。

| Entity                       | 关键字段 / 用途                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `profiles`                   | 对应 Supabase Auth User，基础展示信息与 Stripe Customer Reference                              |
| `generation_tasks`           | User、Modality、Model Key、Normalized Input、Status、Quote、Provider Reference、Result、时间戳 |
| `provider_attempts`          | Provider/Model/Version、External Task ID、Request Hash、State、安全错误分类、实际成本          |
| `media_assets`               | Owner、Purpose、MIME、Size、Storage/Provider URL、Expiry、安全状态；仅在长期持久化确认后使用   |
| `price_versions`             | 不可变生效区间、Credits 换算策略                                                               |
| `model_prices`               | Price Version、Model/Parameter 维度、Credits 与内部成本元数据                                  |
| `quotes`                     | Parameters Hash、Price Version、用户可见 Credits、Expiry                                       |
| `credit_accounts`            | User 的可用与预留余额聚合                                                                      |
| `credit_lots`                | Subscription / Pack 来源与剩余值；两种来源需要确定性消费顺序时使用                             |
| `credit_reservations`        | Quote/Task、Reserved Amount、Release/Settlement State                                          |
| `ledger_entries`             | 不可变 Debit/Credit、Amount、Reason、Task/Payment Link、Idempotency Key、Created Time          |
| `payments` / `subscriptions` | Stripe Customer/Session/Payment/Subscription ID 与可信 Status                                  |
| `stripe_events`              | 唯一 Stripe Event ID、签名验证后的 Receipt 与 Processing State                                 |
| `idempotency_records`        | Actor、Operation、Client Key、Request Hash、Durable Result Reference                           |
| `outbox_events`              | Provider 提交、Webhook 后处理或 Reconciliation 等事务后可靠工作                                |

Credits 使用最小单位整数保存。Provider 货币成本使用 Decimal/Minor Unit，禁止二进制 Float。

## 6. Generation 状态机

```text
draft
  → quoted
  → reserving
  → queued
  → processing
  → succeeded
  → failed | canceled | expired | reconciliation_required
```

规则：

- 只有服务端可将 `quoted` 转为 `reserving`。
- Provider Callback 只能按 Allow-list Transition Table 映射；重复或乱序 Callback 必须幂等。
- Timeout 不自动等于 Failure；Provider Truth 未知时进入 `reconciliation_required`。
- `succeeded` 必须在同一可靠边界内具有 Result Reference 和 Settlement Record。
- 用户取消为 Best Effort；最终用户扣费遵循 fal 已验证的 Billing 语义和批准的用户策略。

## 7. Quote、Reserve、Settle、Compensate

### 提交

1. 解析并校验 Modality、Model 与 Parameters。
2. 读取有效且不可变的 `price_version`，创建或返回 Quote。
3. 一个数据库事务内完成 Ownership/Balance 检查、Task 创建、Credits Reservation 和 Idempotency/Outbox 记录。
4. 使用本地 Task ID 关联 fal 提交，并持久化 External Task ID。

### 成功

1. 验证 Webhook Authenticity，或服务端主动获取 Provider State。
2. 锁定 Task 与 Reservation。
3. 记录实际 Provider Units/Cost 和 Result Reference。
4. 使用提交时快照的 Price Version 结算 Credits。
5. 释放差额并把 Task 标为 `succeeded`。

### 失败或取消

1. 区分 Terminal 与 Retryable。
2. 分开记录 Provider 成本和用户扣费。
3. 按已确认策略释放/调整 Reservation。
4. 追加 Compensation Ledger Entry，不修改或删除旧 Ledger。

零 Credits Job 仍记录 Usage，便于审计真实 Provider 证据。Subscription 与 recurring Pack 同时存在时，按冻结规则确定性消费并在事务中加锁；具体先后顺序在 Credits 阶段根据产品规则写入测试。

## 8. 幂等与并发

- 每个 Generation/Checkout Command 由客户端提供 Idempotency Key。
- 保存 `(actor, operation, key)`、Request Hash 与 Durable Result；相同 Key 不同 Hash 直接拒绝。
- Provider External ID 和 Stripe Event ID 唯一。
- Ledger Entry 使用 Operation/Reason/Task 或 Event Identity 形成唯一约束。
- Balance/Reservation 更新使用 Row Lock 或 Serializable + Retry 事务。
- Stripe SDK Idempotency Key 从本地 Payment Command ID 推导。
- Webhook 只有在 Durable Receipt 成功后才返回 Success，后续处理可安全重试。

## 9. fal 集成边界

```ts
interface GenerationProvider {
  submit(request: ProviderSubmission): Promise<ProviderJobReference>;
  getStatus(externalId: string): Promise<ProviderJobState>;
  cancel?(externalId: string): Promise<ProviderCancelResult>;
  verifyWebhook?(rawBody: Uint8Array, headers: Headers): VerifiedProviderEvent;
}
```

Adapter 把 fal Vendor State/Error 映射为 Domain State，并单独保存安全的 Vendor Metadata。三个模型 ID 只在小范围验证后进入 Server-only Config。`FAL_KEY` 使用环境变量，不得进入 Client Bundle、Git 或日志。

如果真实调用失败，Task 如实进入失败或待对账状态；生产代码不得返回伪造 Result。Mock/Fixture 仅允许在明确隔离的自动化测试中使用。

## 10. Auth 架构

- 自定义 Register/Login 页面调用 Supabase Auth Email/Password 流程；
- Google 使用真实 OAuth Client、准确 Callback Allow-list 和 state/nonce 防护；
- 应用权限以服务端 Session/User 为准，不信任客户端登录标记；
- Application Rows 引用稳定的 Auth User ID；
- Supabase Service Role 只在 Server-only 边界使用；
- Middleware/Server Guard 保护 Account 与所有真实 Generate/Checkout API；
- Forgot/Reset Password 为 P1，邮箱验证不阻塞 P0。

同邮箱 Account Linking、Session Duration、Logout All Sessions 和 Account Deletion 细节仍为 `TBD`，不自行升级为 P0。

## 11. Stripe 架构

使用 Stripe Hosted Checkout Sessions in **Sandbox**，包含一个 Subscription 和一个 recurring Credit Pack。

流程：

1. 已登录用户选择 Allow-list 中的本地 Product/Price Key。
2. 服务端解析 Stripe Price ID；浏览器不能传任意 Amount 或 Secret Price ID。
3. 服务端带本地 Payment Command/User Metadata 与 Idempotency Key 创建 Checkout Session。
4. Return Page 在数据库确认前显示 `confirming`。
5. Webhook 读取 Raw Body、验证签名并唯一保存 Event ID。
6. 只有 `invoice.paid` 的一个事务更新 Payment/Subscription，并追加 Entitlement/Credit Ledger Entry；`checkout.session.completed` 只关联 Checkout 与 Subscription。
7. Delayed、Duplicate 和 Out-of-order Event 可安全处理。
8. 对 Stuck Record 可通过 Stripe API 定期或人工 Reconciliation。

最终 Event Allow-list 为 `checkout.session.completed`、`checkout.session.expired`、`invoice.paid`、`invoice.payment_failed`、`customer.subscription.created`、`customer.subscription.updated` 与 `customer.subscription.deleted`。每个 Price 的正整数 `credits` 由服务端读取的 Test Mode Stripe Price Metadata 冻结到本地 Payment/Subscription；任何 Browser Redirect 或 Query 参数都不能直接发放 Credits。

## 12. SEO 架构

- 使用 Next.js App Router 的 Server Rendering/Static Generation 与 Metadata API。
- 每个公开 Route 有独立 Title/Description、Canonical、Open Graph/X 数据和单一 H1。
- 通过 Framework Convention 生成 `robots` 和 `sitemap`。
- 只为页面上真实存在的内容添加 Structured Data，例如 Organization、WebSite、BreadcrumbList、适用时的 FAQPage。
- `features/{slug}` 与 `models/{slug}` 使用 Typed Content Record 和复用模板，只生成批准 Slug。
- Account、Callback、Checkout Return、Private Job 与 API 为 `noindex` 或从 Sitemap 排除。
- Locale Routing 与 `hreflang` 为 P2/TBD。
- 自动验证 Server HTML、Canonical、Sitemap、Broken Link、Heading、404 与 Redirect。

## 13. 媒体存储与异步工作

Database 阶段前核实 fal Output URL 生命周期。若 History 要求超过该期限，则 Supabase Storage 成为必要项：使用短期 Signed URL、服务端 MIME/Size 校验、Ownership Policy 和 Lifecycle Deletion，不通过普通 App Request 代理大 Video。

初始不增加独立 Queue Platform。fal Queue/Webhook 加 Database Outbox/Reconciliation 足够时保持该方案；只有真实行为或 Deployment Limit 证明必要时再升级。

## 14. 环境变量与安全

- 所有 Secret 放在 `.env.local` 或 Managed Secret Store；只提交无值的 `.env.example`。
- `NEXT_PUBLIC_*` 只包含可公开的 Supabase URL/Anon Key；Service Role、fal 与 Stripe Secret 禁止使用该前缀。
- OAuth 精确 Redirect URI，使用 state/nonce 和安全 Cookie。
- Stripe Webhook 校验 Raw Body 与 Signature。Phase 6 fal Queue Callback 使用每次提交附加的高熵 HTTPS URL token、原始 Body SHA-256 Receipt 与数据库幂等约束；不得接受无 token 的 callback。若 fal 账户启用或发布签名验证能力，必须在部署前增加该验证。
- Auth、Quote、Upload、Generation 与 Checkout 需要 Input Validation、Rate Limit 和 Abuse Control。
- 默认不记录完整 Prompt/Media/Provider Raw Response，日志中 Redact Secret 与敏感字段。
- 媒体默认 Private，并定义 Retention/Deletion。
- CI 最终加入 Dependency、Secret 与 License Scan；未真正配置或执行前保持 `NOT EXECUTED`。

## 15. 质量与测试分层

最终目标命令：`format`、`lint`、`typecheck`、`test`、`test:integration`、`test:e2e`、`test:contract`、`build` 与显式 Opt-in 的 `test:real:*`。

- Unit：Pricing Rule、State Transition、Ledger Allocation、Error Mapping；
- Database Integration：Transaction、Concurrency、Idempotency、RLS/Ownership；
- Contract：fal/Stripe Payload Fixture、Signature Handling、Schema Drift；
- E2E：Auth、Studio、Quote、Task、Payment Return、Account；
- Real Integration：Google、三个 fal 模型和 Stripe Sandbox，独立标记并限制预算；
- Visual：固定环境与批准 Viewport 的 Playwright Screenshot；
- SEO/Accessibility：Server HTML、Link/Sitemap/Canonical、axe/Lighthouse 与人工键盘测试。

Mock/Stub 只能用于隔离测试。Release Gate 必须单独记录真实 Demo 路径的 Integration `PASS`。

## 16. 风险与未决架构项

| 风险 / 决策                  | 影响                                  | 处理                                                                    |
| ---------------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| Cloudflare 阻断视觉调研      | 无法冻结 Fidelity/Token               | 用户提供可访问浏览器或 Reference Screenshot；之前保持 `Requires access` |
| fal Model/成本未确认         | 真实 Demo 可能失败或超预算            | AI 阶段前小范围验证三个 Endpoint，设置硬预算                            |
| Media TTL/History 期限未知   | 决定 Supabase Storage 是否必要        | 在 Storage/Generation 阶段核实并记录 ADR                                |
| Auth/Google Credentials 缺失 | 不能完成真实 E2E                      | 标记 `Requires credentials`，不以 Mock 冒充                             |
| Stripe Live Mode 未获授权    | 不能进行真实收款或上线验收            | 已完成 Sandbox 闭环；继续只使用 Sandbox/Test，Live Mode 保持未授权      |
| Deployment 未选              | Webhook、Region 和 Preview 流程未冻结 | 到 Deployment Planning 再确认，不阻塞 Foundation                        |
| Creen Pricing 文案存在矛盾   | 直接复制会引入缺陷                    | 以本项目已批准 Product/Price 为 Source of Truth                         |
