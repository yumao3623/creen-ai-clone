# Creen.ai Clone — 入职能力验证题 2

状态：**Phase 1–13 已完成最终 Traceability Review。Candidate M 范围冻结；Production Demo 与 R13-01 线上发布验收均已通过。**

本项目按 Candidate M 实现一个代表性完整的统一 AI 创作工作区。当前已接入真实 Supabase Auth、server-only fal 三模态 Queue Adapter、统一 Credits 的 Quote/Reserve/Settle/Compensate/Ledger，以及 Stripe Hosted Checkout Sandbox 代码路径。生产 Demo 路径禁止使用 Mock 冒充成功结果。

Production Demo：<https://creen-ai-clone.vercel.app>。已验证 Google OAuth 到 Account、Supabase Auth 回调、Stripe Sandbox webhook 签名交付（HTTP 200）、全部 indexable public routes、`/create -> /studio`、`/robots.txt`、`/sitemap.xml` 与未登录 Generate guard。不记录任何生产 Credential、Cookie 或 Signing Secret。

## 当前完成内容

- Next.js `16.3.1` App Router + React `19.2.8` + Strict TypeScript；
- pnpm Lockfile、ESLint、Prettier、Vitest 与 Production Build 质量门禁；
- 最小响应式 App Shell、Design Token、Skip Link、Loading/Error/404 Foundation；
- Email/Password Register/Login、Google OAuth Callback、当前设备 Logout 与 Cookie Session Persistence；
- `/account` 服务端 Guard、游客可访问 `/studio`、`/api/generate` 双层认证 Guard；
- 未配置 Credential 时公开页面仍可运行，受保护页面/API 返回明确安全状态；
- 八份核心项目文档中文化并同步 Candidate M 确认决策；
- 分 13 阶段的可执行 Implementation Plan；
- Phase 5 Core Domain Migration、RLS、事务 RPC、Generation 状态机、Repository 边界与迁移/领域契约测试；
- fal Text → Image、Image → Video、Text → Speech 的固定模型契约、官方 Queue Adapter、上传、Webhook Receipt/Outbox 与 Reconciliation；
- fal 三个固定模型各一次真实生成、远端 Webhook Receipt/Replay 与 Result Evidence；
- `production.credits.v1` 冻结价格、Quote API、Lot Allocation、原子 Reservation、成功 Settlement、失败 Compensation 与不可变 Ledger；
- Generate 在 fal 前检查余额并预留，callback 在同一事务消费 Receipt 并最终化 Credits；
- Stripe 两个 Product Allow-list、服务器端 Checkout Command、Raw-body 签名 Webhook、Invoice 幂等 Mapping 与可信 Credits Ledger；
- Stripe Sandbox 的 Subscription、Recurring Credit Pack、Cancel、Decline、3DS、Bank/Link、Webhook Replay 与远端 Credits/Ledger 对账；
- Candidate M 的 Home、Features、Models、Pricing、五个代表性 Landing、FAQ/About/Contact/Privacy/Terms/Refund 页面与移动端导航；
- 统一 Studio 的 Text → Image、Image → Video、Text → Speech 三个独立表单、Quote/余额不足/队列/失败状态，以及受保护 Account 的 History、Credits Ledger、Subscription/Payment 只读视图；
- Phase 4 的 Lint、Typecheck、6 个测试文件/18 个测试、Production Build 与本地 HTTP Smoke 已真实执行。

Phase 13 未扩展已冻结需求，也没有执行新的 fal 生成或真实 Stripe Checkout。最终五项要求、代码卫生、测试与线上交付状态见 `docs/phase13-final-review.md`；部署步骤、环境变量边界、Demo URL 和验收记录见 `docs/deployment-notes.md`。Credits 真实 Supabase 验收证据位于 `docs/real-integration/phase7-credits-2026-08-15t164751872z.json`；Stripe Sandbox 真实验收证据位于 `docs/real-integration/phase8-stripe-2026-08-16t000000000z.json`。

## 本地启动

要求 Node.js `>=20.9.0` 与 pnpm `11.19.0`。本地安装后运行：

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

Auth 的本地配置与 Supabase/Google Dashboard 步骤见 [`docs/authentication.md`](docs/authentication.md)。变量只通过 `.env.local` 或托管 Secret Store 配置，变量名示例见 `.env.example`。

## 文档导航

- [`docs/research.md`](docs/research.md)：Creen.ai 与第三方能力调研、证据边界和限制。
- [`docs/evidence-index.md`](docs/evidence-index.md)：Evidence ID、Source URL、访问状态与证据缺口。
- [`docs/PRD.md`](docs/PRD.md)：已冻结的 Candidate M、P0/P1 与明确非范围。
- [`docs/design.md`](docs/design.md)：信息架构、Studio 与关键 UI State；视觉 Token 仍待证据。
- [`docs/architecture.md`](docs/architecture.md)：已确认技术主路径、领域边界、数据模型与集成边界。
- [`docs/decisions.md`](docs/decisions.md)：Accepted ADR 与仍需验证的决策。
- [`docs/implementation-plan.md`](docs/implementation-plan.md)：13 个实施阶段、验收、测试与外部依赖。
- [`docs/test-cases.md`](docs/test-cases.md)：测试状态单一事实来源。
- [`docs/phase12-testing-evidence.md`](docs/phase12-testing-evidence.md)：Phase 12 本地质量门禁、E2E、安全审计及真实集成证据边界。
- [`docs/phase13-final-review.md`](docs/phase13-final-review.md)：招聘方五项原始要求的最终 Traceability Review、代码卫生与风险标签。
- [`docs/deployment-notes.md`](docs/deployment-notes.md)：Production Node.js 部署、迁移、验收、环境变量边界与已验证 Demo 状态。
- [`docs/development-log.md`](docs/development-log.md)：真实执行过程、问题与检查记录。
- [`docs/authentication.md`](docs/authentication.md)：Supabase 与 Google OAuth 配置、Redirect 和真实验收清单。
- [`docs/database.md`](docs/database.md)：Phase 5 Schema、RLS、RPC 与远端数据库验收步骤。
- [`docs/ai-generation.md`](docs/ai-generation.md)：Phase 6 fal 模型、配置、Webhook/对账边界与真实验收清单。
- [`docs/credits.md`](docs/credits.md)：Phase 7 冻结价格、事务边界、API、Migration 与真实验收步骤。
- [`docs/stripe.md`](docs/stripe.md)：Phase 8 Checkout、Webhook、Invoice Credits、配置与真实 Sandbox 验收步骤。

原始交接材料位于 [`task2-handoff/`](task2-handoff/)。初始 Prompt 中的 `docs/task2-handoff/` 在仓库内不存在。

## 当前硬限制

- Creen.ai 线上访问仍可能受 Cloudflare 限制；项目已基于提供的参考截图完成本地响应式与视觉审阅，但不主张未取得的线上逐像素对比。
- Supabase、Google OAuth、fal 与 Stripe Sandbox Credential 仅配置在非提交环境与 Vercel Production Secret Store；Auth、Phase 5–8 数据库、Credits、fal 三模态与 Stripe Sandbox 真实验收均已完成。
- Phase 6 三个 fal Model ID 已真实生成 Image、5 秒 Video 和 Audio。fal Usage Dashboard 明细合计 `$0.2866`，页面显示 `$0.29`，低于 `$5` 授权上限和约 `$0.56` 保守估算。
- 未授权 Stripe Live Mode；项目只使用 Sandbox/Test Environment。
- 未授权 Stripe Live Mode；Production 仍只使用 Sandbox/Test。空 Supabase 数据库完整 migration replay 与 hosted CI/full secret-license scanner 未执行，均在 Phase 13 风险记录中保留。
