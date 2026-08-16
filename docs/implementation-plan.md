# 实施计划（Implementation Plan）

状态：**Candidate M 执行计划；不扩展已冻结需求**  
日期：**2026-08-14**

## 1. 执行原则

- 每个阶段完成必要检查、修复关键问题并更新 `development-log.md` 后，才进入下一阶段。
- 核心第三方路径必须真实接入；Mock/Fixture 只用于隔离测试，不能配置到 Demo 生产路径。
- Credentials、Budget、Access 缺失时如实标记 `Requires credentials`、`Requires budget` 或 `Requires access`。
- 所有 Secret 使用环境变量，不进入 Client Bundle、Git 或文档示例值。
- Phase 1–7 已完成；本轮执行 Phase 8 Stripe，并在该阶段停止，不进入完整页面。

## 2. 分阶段计划

### Phase 1 — Plan 与范围冻结

- 目标：把 Candidate M、Auth、匿名边界、三模态、Credits、Stripe 与非范围同步为单一事实。
- 模块：`docs/PRD.md`、`architecture.md`、`design.md`、`decisions.md`、`test-cases.md`。
- 验收：已确认项不再显示 Proposal；真正未决项仍为 TBD；文档链接与 Markdown 结构有效。
- 测试：文档链接检查、关键词/状态审阅、Git Diff Review。
- 外部依赖：无。

### Phase 2 — Project Scaffold

- 目标：建立成熟的 Next.js App Router + TypeScript 工程底座。
- 模块：Package Scripts、`src/app`、TypeScript、ESLint、Formatter、Test Runner、Git Ignore、Env Example。
- 验收：Strict TypeScript；明确 `lint`、`typecheck`、`test`、`build` Script；无 Secret；无业务集成和生产 Mock。
- 测试：Lint、Typecheck、Foundation Unit Test、Production Build。
- 外部依赖：Node.js、pnpm（由 Codex 工作区运行时提供）、Git；需要 Package Registry 访问。系统 npm 可用但本次安装进程异常挂起，实际 Scaffold 固定使用 `pnpm@11.19.0`。

### Phase 3 — Foundation

- 目标：建立最小 App Shell、Design Token、Error/Loading/404 基础、环境变量边界和模块目录，不实现后续业务。
- 模块：`src/app`、`src/components`、`src/config`、`src/domain`、`src/integrations`、`src/lib`。
- 验收：首页仅作为工程 Foundation，不声称视觉复刻完成；响应式基础与 Focus 可用；Server-only/Client Env 边界清晰。
- 测试：Unit、Lint、Typecheck、Build；基础 Accessibility/Responsive Smoke 结果如实记录。
- 外部依赖：无业务 Credentials。

### Phase 4 — Authentication

- 状态：**PASS；真实 Email/Password 与 Google OAuth Local E2E 已通过**。
- 目标：完成 Email/Password 与 Google Auth、Logout、Session Persistence 和 Access Guard。
- 模块：Supabase Client/Server Adapter、Register/Login/Callback、Middleware/Server Guard、Account Shell。
- 验收：真实 Email/Password 与 Google 流程可重复通过；游客可浏览 Studio，真实 Generate API 被保护；错误状态完整。
- 测试：Auth Unit/Contract、Route Guard Integration、Owned Test User E2E。
- 外部依赖：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、Server Credential（若必要）、Google OAuth Client 与 Redirect URI。缺失时为 `Requires credentials`。

### Phase 5 — Database / Core Domain

- 状态：**代码、隔离契约测试及真实 RLS/Ownership/幂等/并发 Integration PASS；Clean-environment Migration History Replay 尚未验证**。
- 目标：通过 Migration 落地 User Mapping、Generation、Credits、Ledger、Payment Reference、Idempotency 与 Outbox。
- 模块：Schema/Migration、Repository、Generation State Machine、RLS/Ownership。
- 验收：Migration 可重复；Ownership/RLS 生效；状态迁移与幂等有数据库约束。
- 测试：Migration、Repository Integration、Concurrency、RLS/Ownership。
- 外部依赖：Supabase/PostgreSQL Project；Local CLI 仅在 Migration Workflow 确认需要时安装。

### Phase 6 — AI Generation

- 状态：**PASS；代码、隔离契约测试、远端 Webhook 与三项真实 fal Integration 均已完成。**
- 目标：确认并真实接入 Text → Image、Image → Video、Text → Speech 各一个 fal 模型。
- 模块：Typed Modality Contract、fal Adapter、Queue/Webhook/Reconciliation、Upload Input、Result Mapping。
- 验收：三个真实请求分别成功并保存 External Task/Result Evidence；失败如实落库；生产路径无 Mock。
- 测试：Adapter Unit/Contract、Webhook Idempotency、三项 Opt-in Real Integration。
- 外部依赖：`FAL_KEY`、三个可用 Model、公开 HTTPS Webhook、Supabase Service Role、网络与 `$5` Hard Budget 已用于 2026-08-15 真实验收。

### Phase 7 — Credits

- 状态：**PASS；代码、远端 Migration、真实并发、Settlement、Compensation 与 Ledger 对账均已完成。**
- 目标：三个模态统一进入 Quote → Reserve → Settle/Compensate → Ledger。
- 模块：Price Version、Quote、Credit Account/Lot、Reservation、Ledger、Generation Orchestration。
- 验收：提交前展示确定成本；余额不足不调用 fal；成功只扣一次；失败不错误扣费；可从余额追溯到 Task/Price Version。
- 测试：Pricing Unit、事务/并发 Integration、Duplicate Submit、Failure Compensation、E2E Reconciliation。
- 外部依赖：每个模型 Credits 定价策略需在真实成本确认后冻结。

### Phase 8 — Stripe

- 状态：**PASS；Stripe Sandbox 真实验收、远端 Migration、Credits/Ledger 对账已完成。**

- 目标：完成 Subscription 与 recurring Credit Pack 两个真实 Hosted Checkout Sandbox 流程。
- 模块：Product Allow-list、Checkout Session、Return Page、Raw-body Webhook、Subscription/Payment Mapping、Credits Ledger。
- 验收：Sandbox 支付后由签名 Webhook 更新可信状态；Return URL 不能直接加 Credits；重复/乱序 Event 幂等。
- 测试：Signature/Fixture Contract、Webhook Integration、Sandbox Success/Cancel/Decline/3DS/Delay E2E。
- 外部依赖：Stripe Sandbox Secret/Publishable Key、两个 Price ID、Webhook Secret；本地 Webhook 调试确有需要时再安装 Stripe CLI。

### Phase 9 — Main Pages / Studio

- 状态：**PASS；功能、路由与最小 Keyboard Smoke 已完成。视觉 Fidelity 与人工截图比较仍为 NOT EXECUTED。**

- 目标：完成 Candidate M 主页面、统一 Studio、Account/History/Credits/Payment 与主要状态。
- 模块：Page Composition、Studio Forms、History Query、Pricing/Auth CTA、Support/Legal Shell。
- 验收：所有确认 Route 与主 CTA 可用；三个模态独立；Loading/Empty/Error/Success 和 Auth/Credit/Payment State 完整。
- 测试：Component、Route/E2E、Keyboard Smoke。
- 外部依赖：准确 Creen 视觉参考仍为 `Requires access`；没有参考时不声明视觉 Fidelity `PASS`。

### Phase 10 — SEO

- 状态：**PASS；本地 Metadata、Route Graph、Robots/Sitemap、JSON-LD 与 Index Boundary 已验证。正式 Primary Domain 仍须在部署环境配置。**

- 目标：把调研得到的 SEO 逻辑落实到代表性公开页面。
- 模块：Metadata、Typed Landing/Model Content、Internal Link、Sitemap、Robots、Structured Data、404/Redirect。
- 验收：每 Route 独立 Intent/Metadata/H1；无近重复页面；Private Route 不索引；Broken Link 为零。
- 测试：Server HTML、Metadata/Canonical、Sitemap/Robots、Link、Schema Validation。
- 外部依赖：Primary Domain/Deployment URL 在上线前确认。

### Phase 11 — UI / Responsive Polish

- 状态：**PASS with documented differences；已依据用户提供的 Creen desktop/mobile 源截图完成视觉对照、必要 UI 修正和 Chromium 验证；本地受控会话的已登录 Account 截图复核也已通过。**

- 目标：依据真实 Screenshot 打磨 Home、Studio、Pricing、Auth、代表性 Landing 与 Account。
- 模块：Design Token、Responsive Layout、Motion、Media Treatment、Interaction State。
- 验收：批准 Viewport 的人工对比与可解释差异；关键页面具有明显人工打磨感。
- 测试：Playwright Screenshot、Manual Responsive、Keyboard、axe、Reduced Motion。
- 外部依赖：用户已提供 `docs/reference-screenshots/` 中的 Home、Studio、Pricing、Auth、Landing 与 Account 参考图。

### Phase 12 — Testing

- 目标：收口 Unit、Integration、Contract、E2E、Real Integration、Security 与 Build Evidence。
- 模块：全部测试层、CI、Evidence Record。
- 验收：`lint`、`typecheck`、`test`、production `build` 全部真实 `PASS`；真实 Google/fal/Stripe 与 Stub 结果分开。
- 测试：完整质量矩阵；未执行项保持 `NOT EXECUTED`。
- 外部依赖：全部 Sandbox Credentials、Test User、AI Budget、可运行环境。

### Phase 13 — Final Review

- 目标：对招聘方五项原始要求逐条完成 Traceability Review。
- 模块：README、PRD、ADR、Development Log、Test Cases、Deployment Notes。
- 验收：代码与文档一致；无 Secret/Production Mock/Dead CTA/大面积 unused/大量 `any`；每项有 Evidence 或明确 Risk Label。
- 测试：Clean Install、Migration、Build、Smoke、Manual Demo Rehearsal。
- 外部依赖：最终 Demo URL、Account Ownership 与验收环境。

## 3. 当前停止条件

Phase 13 Final Review 与 R13-01 线上发布验收已完成，Phase 1–13 的 Candidate M 范围、Auth、fal、Credits、Stripe、页面和 SEO 契约未改变。Production Demo 已部署在 `https://creen-ai-clone.vercel.app`；Google OAuth 到 Account、Supabase callback、Stripe Sandbox webhook 签名交付、全部 indexable public routes、`/create -> /studio`、`/robots.txt`、`/sitemap.xml` 与未登录 Generate guard 均已通过线上验证。空 Supabase 数据库完整 migration replay、hosted CI 与 full secret/license scanner 均未执行，并保留明确风险标签。
