# 开发日志

本日志只记录真实发生的工作，不补写或伪造过程。

## 2026-08-16 — Phase 11 Source Fidelity 对照与媒体丰富化

- 用户提供了 `docs/reference-screenshots/` 中的 1440×960 与 390×844 Creen 源截图，覆盖 Home、Studio、Pricing、登录、AI Image Generator Landing 及多个已登录 Account 状态。
- 依据截图重整黑色画布、青绿强调、紧凑 Header、深色 Creator Panel、Pricing 横向移动轨道、登录模态层级与 Account 资料/余额层级；所有真实认证、报价、Credits、付款与路由行为保持不变。
- 新增六张项目内 Gallery 图片，其中三张由 Phase 6 的 `fal-ai/flux/schnell` 真实生成：山谷日出、金刚鹦鹉和时尚人物；另外三张为同轮生成的暗色工作室系列。素材保存在 `public/media/phase11-gallery-*.jpg`。
- 新增 `scripts/phase11-generate-gallery-media.mjs` 作为显式环境变量授权、单次最高 `$1` 的 Gallery 图像生成脚本；两次实际运行各声明最高 `$0.03`，共提交六张图片。
- 修复 Screenshot 中图库的懒加载占位问题：展示用图片显式 eager loading，并在 Playwright 检查 `naturalWidth > 0`。
- 新增显式授权的 `scripts/phase11-account-visual.mjs`：创建受控 Supabase 用户、运行登录后的 Account 截图场景、在 `finally` 删除该用户。实际复核通过，截图为 `test-results/phase11-ui-controlled-session-renders-the-Account-overview-chromium/account-signed-in-desktop.png`。
- 验证：`pnpm format`、`pnpm lint`、`pnpm typecheck`、`pnpm test`（69 passed）、`pnpm test:e2e`（15 passed，未提供受控凭据时跳过 Account 场景）、`PHASE11_ACCOUNT_VISUAL=1 node scripts/phase11-account-visual.mjs`（16 passed）。

## 2026-08-14 — Research / Requirements / Scope / Architecture Proposal

### 已完成

- 完整阅读仓库根目录 `task2-handoff/` 的 01–08 交接材料。
- 确认仓库初始只有未跟踪交接文件，没有 Application Code。
- 调研 Creen 当前公开 Route、Content Hierarchy、Modality、Pricing/Credits、Support/Legal 与 SEO Page Family。
- 尝试 In-app Browser 和 HTTP 直接访问，并如实记录 Cloudflare 限制。
- 调研 fal、Replicate、Google Vertex AI、Supabase Auth、Better Auth、Clerk、Stripe、Next.js 与 Playwright 官方资料。
- 建立 P0/P1/P2/TBD、Candidate S/M/L、Design/State Proposal、Architecture Candidate、ADR 与 Test Matrix。

### 实际检查

| Action                                                 | Result                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| Repository Inventory 与 `git status --short --branch`  | PASS — 初始无 Commit，只有未跟踪 Handoff                       |
| 阅读 Handoff 01–08                                     | PASS                                                           |
| In-app Browser 访问 `https://www.creen.ai/`            | NOT EXECUTED successfully — Navigation 未完成                  |
| 对 Home/Create/Pricing/Robots/Sitemap 执行 HTTP `HEAD` | FAIL for content access — Cloudflare `403`，证据已保存         |
| 搜索抓取器读取 Creen 官方公开 URL                      | PASS for Public HTML/Content Inventory                         |
| 第三方官方文档调研                                     | PASS for Candidate Comparison                                  |
| Google/fal/Stripe 真实集成                             | NOT EXECUTED — 无 Credential/Budget，且尚未进入 Implementation |

## 2026-08-14 — 范围收口与文档中文化

### 已完成

- 按本轮确认采用 Candidate M。
- 确认 Email/Password + Google Auth、游客浏览但 Generate 前登录、三个独立真实模态和统一 Credits。
- 确认 Stripe Hosted Checkout Sandbox 的一个 Subscription 与一个 recurring Credit Pack。
- 明确 Admin、Community、Team、Multi-provider、大量 Model、Guest Credit、复杂 Billing 与大量 Programmatic SEO 不属于当前 P0。
- 将八份核心交付文档转为简体中文并同步 Proposal/Candidate/TBD 状态。
- 同步中文 `README.md` 与 Research Evidence 说明。
- 新增 `docs/implementation-plan.md`，按 13 个阶段记录目标、模块、验收、测试与外部条件。

### 保留的真实未决项

- 三个 fal Model ID、Price/Terms/Region 与 Hard Test Budget：`TBD / Requires credentials`。
- Supabase/Google/fal/Stripe Sandbox Account 与 Key：`Requires credentials`。
- Media 长期保存策略与 Retention：`TBD`。
- Deployment Platform/Region：`TBD`。
- Creen 视觉/响应式/交互证据：`Requires access`。

## 2026-08-14 — Project Scaffold / Foundation

### 环境检查

| Tool    | Result                                                                 |
| ------- | ---------------------------------------------------------------------- |
| Node.js | PASS — `v24.19.0`                                                      |
| npm     | PASS — `11.17.0`；PowerShell 会拦截 `npm.ps1`，`npm.cmd` 可正常运行    |
| Git     | PASS — `2.55.0.windows.3`                                              |
| pnpm    | PASS — Codex Workspace Runtime 提供 `11.19.0`，已写入 `packageManager` |

无需安装 Python、Java、Android Studio、Supabase CLI 或 Stripe CLI。

### Scaffold 与 Foundation 变更

- 使用官方 `create-next-app@latest` 生成 Next.js App Router + TypeScript 配置基线，并固定实际生成版本 `next@16.3.1`、`react@19.2.8`。
- 使用 `pnpm-lock.yaml` 固定依赖；明确拒绝 `unrs-resolver` 的非必要 Postinstall Script。
- 开启 TypeScript `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 与 `allowJs: false`。
- 配置 ESLint、Prettier、Vitest、Typecheck 与 Production Build Script。
- 添加无真实值的 `.env.example`，并通过 `.gitignore` 排除本地 `.env*`、Build、Coverage 与 Store Cache。
- 建立 `src/config`、`src/components` 与 App Router Foundation。
- 实现最小响应式 App Shell、可替换 CSS Design Token、Skip Link、Focus Style、Reduced Motion、Loading、Error 与 404 状态。
- 首页只说明 Candidate M 与当前 Foundation，不实现 Auth、fal、Credits、Stripe 或完整主页面。

### 遇到的问题与处理

1. PowerShell Execution Policy 阻止 `npm.ps1`：改用官方 `npm.cmd`，不修改系统安全策略。
2. 系统 npm 安装进程连续挂起且未生成 Lockfile：终止本轮产生的遗留 Node Process，改用工作区自带 pnpm。
3. Registry 下载速度较慢，`next-16.3.1.tgz` 与 Windows `sharp` 超过 pnpm 默认 60 秒：验证 Registry `200` 后提高单包 Fetch Timeout，最终按 Registry Integrity 完成安装。
4. pnpm 11 默认阻止未批准 Build Script：将 `unrs-resolver` 明确设为不允许执行；Windows Native Binding 已随 Optional Dependency 落盘。
5. Vitest 提示 ESM Config 前瞻性 Warning：在 `package.json` 设置 `"type": "module"` 后复跑通过。
6. 首次 Typecheck 依赖 Next 生成的全局 `LayoutProps`：改为显式 `ReactNode` Props，使未 Build 前也可独立 Typecheck。
7. 初始化和断点下载所用 `.downloads/`、`scaffold-tmp/` 已在确认绝对路径位于 Workspace 后删除；不可恢复，但只包含生成的临时文件。

### 本阶段实际验证

| Check                          | Result                                                                      |
| ------------------------------ | --------------------------------------------------------------------------- |
| Next.js Version                | PASS — `16.3.1`                                                             |
| `pnpm lint`                    | PASS                                                                        |
| `pnpm typecheck`               | PASS                                                                        |
| `pnpm test`                    | PASS — 1 Test File，2 Tests                                                 |
| `pnpm build`                   | PASS — Next.js Production Build，`/` 与 `/_not-found` 静态生成              |
| `pnpm format`                  | PASS — 首次发现 19 个文件；排除 Handoff/Lockfile 后格式化本轮文件并复跑通过 |
| Auth / fal / Credits / Stripe  | NOT EXECUTED — 按阶段约束未开始                                             |
| Browser Visual / Responsive QA | NOT EXECUTED — 本轮未请求 Browser Test，且 Creen Reference Requires access  |

### 下一阶段

进入 Authentication 前，先准备 Supabase Project 与 Google OAuth Credential，并按 `implementation-plan.md` Phase 4 单独实施和验证；不得同时跨入 fal、Credits 与 Stripe。

## 2026-08-14 — Phase 4 Authentication

### 已完成

- 安装并锁定 `@supabase/ssr@0.12.4` 与 `@supabase/supabase-js@2.112.3`。
- 按官方 Next.js SSR 路径建立 Browser、Server 与 Root Proxy Adapter；Token Refresh 写回 Cookie，并透传 SDK 的私有防缓存 Header。
- 实现 Email/Password Register/Login、Google OAuth PKCE 发起与 Callback Code Exchange、当前设备 Logout。
- 实现 Login/Register 的输入校验、Submitting、成功提示与安全错误映射；不向 UI 暴露原始 Provider Detail。
- 实现 `/account` 服务端保护页、游客可访问 `/studio`，以及 Root Proxy + Route Handler 双层保护的 `POST /api/generate`。
- Generate 在 Auth 通过后如实返回 `501 generation_not_implemented`，没有跨入 Phase 6 或伪造 AI Result。
- 实现 `next` 站内路径验证，拒绝 Scheme-relative 与外部 Redirect；处理 Google Cancel、Callback Failure、Session Expired 与 Auth Unavailable。
- 补充 Supabase/Google Dashboard 配置、Redirect URI 与真实 E2E Checklist；Phase 4 不引入 Service Role Key。

### 实际验证

| Check                                    | Result                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm format:write` / `pnpm format`      | PASS — Phase 4 代码与文档已格式化                                                |
| `pnpm lint`                              | PASS — ESLint Exit 0，无 Warning                                                 |
| `pnpm typecheck`                         | PASS — Strict TypeScript Exit 0                                                  |
| `pnpm test`                              | PASS — 6 Test Files，18 Tests；含 Unit、OAuth Contract、Proxy Guard Integration  |
| `pnpm build`                             | PASS — Auth Routes、Studio、Account、Generate API 与 Root Proxy Production Build |
| Local Production HTTP Smoke              | PASS — Public/Auth 200；Account 307；无 Credential Generate 503                  |
| 真实 Email Register/Login/Logout/Refresh | NOT EXECUTED — Requires Supabase Credential 与 Owned Test User                   |
| 真实 Google Consent/Callback/Identity    | NOT EXECUTED — Requires Supabase + Google Credential 与 Owned Test User          |

### 阶段停止条件

Phase 4 代码、隔离测试、构建与无 Credential Smoke 已完成。因工作区没有 Supabase/Google Credential，真实 Provider E2E 保持 `Requires credentials`；本轮按要求停止，不进入 Phase 5 Database / Core Domain。

## 2026-08-15 — Phase 4 Real Provider E2E / Logout Repair

### 真实验收

- 在本地 Supabase Project 配置 Email Provider、Site URL、Redirect URL 与 Google Provider；所有 Credential 只保留在未提交的本地配置和 Supabase/Google Dashboard。
- 使用项目所有者控制的测试邮箱完成 Register、Confirm Email Callback、Email Login、Session Persistence、Server Guard 与 Local Logout。
- 使用 Google Test User 完成真实 Consent、Supabase Callback Code Exchange 与 Provider Identity 验证。
- 游客 Studio 保持可访问，未登录 `POST /api/generate` 返回真实 `401 authentication_required`。

### Logout 修复

- 真实验收发现 Server Action Logout 在页面重渲染时进入 Error Boundary。
- 将 Logout 改为 `POST /auth/logout` Route Handler，使 Cookie 清除与 `303 /login?notice=signed_out` 响应在同一 HTTP 边界完成。
- 新增 Logout Route Contract Test；隔离测试由 18 增至 19。
- 修复后在本地 Production Server 真实验证：登录后退出成功跳转 Login，显示当前设备会话已安全退出。

### 实际检查

| Check                          | Result                                                                     |
| ------------------------------ | -------------------------------------------------------------------------- |
| Lint / Typecheck               | PASS — Logout Repair 后重新执行                                            |
| Vitest                         | PASS — 7 Test Files，19 Tests                                              |
| Production Logout E2E          | PASS — Local Logout 清 Cookie 后 `303` 跳转 Login，显示 Signed-out Notice  |
| Google Cancel / Callback Error | NOT EXECUTED — 保持 Contract Test PASS；尚未进行真实 Provider 边界路径验收 |

## 2026-08-15 — Phase 5 Database / Core Domain

### 已完成

- 新增可重放的 Supabase PostgreSQL Migration：`profiles`、版本化报价、Generation/Provider/Media、Credits/Ledger、Payment/Subscription/Stripe Event、Idempotency 与 Outbox 表。
- 以 `auth.users` 为身份主键；新增 Auth User 触发器会创建对应 Profile 与零余额 Credit Account。
- 为用户数据启用 RLS，并只授予 owner 的读取能力；写入由受控 Server/RPC 或后续服务端流程承担，避免浏览器直接篡改 Credits、Ledger、Payment 或 Task。
- 增加 Generation 状态转换 Trigger、Price/Ledger append-only Trigger、Provider External ID、Stripe Event ID 与 Idempotency Key 等数据库唯一约束。
- 增加 `submit_generation_task` Security Definer RPC：同一事务完成 Quote Ownership/Expiry 检查、Task、Idempotency Record 与 Outbox Event；同 Key+同 Hash 重放既有结果，不同 Hash 拒绝。
- 新增服务器专用 Repository 边界、稳定 JSON Request Hash 以及与 SQL 状态表一致的领域状态机。

### 实际验证

| Check                                            | Result                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Generation State / Request Hash Unit             | PASS — 新增领域单测                                                                                    |
| Migration Schema/RLS/Idempotency Contract        | PASS — 新增 Migration 静态契约测试                                                                     |
| Remote Migration 首次执行                        | PASS — 2026-08-15；Supabase Dashboard SQL Editor 返回 `Success. No rows returned`                      |
| Real RLS / Ownership / Idempotency / Concurrency | PASS — 2026-08-15；A/B 真实 JWT、PostgREST RPC、PowerShell 并发 Job 验收                               |
| Clean-environment Migration History Replay       | NOT EXECUTED — 主远端项目首次执行成功；尚未在隔离空数据库从 migration history 重建，禁止重跑已应用 SQL |
| fal / Credits Settlement / Stripe                | NOT EXECUTED — 按阶段边界未进入                                                                        |

### 真实验收证据

- 账号 A 对同一 `client_key` 和相同请求执行两次 RPC：第一次返回 `was_replayed=false`，第二次返回相同 Task ID 和 `was_replayed=true`。
- 账号 A 使用同一 `client_key` 但不同 Request Hash 提交，真实 PostgREST RPC 返回 `400 Bad Request`。
- 账号 B 无法读取账号 A 的 Profile、Quote、Generation Task、Credit Account、Ledger 或 Idempotency Record，也无法使用 A 的 Quote 创建 Task。
- 两个并发的账号 A RPC 返回相同 Task ID，分别返回 `was_replayed=false` 与 `was_replayed=true`，确认只创建一个 Task。

## 2026-08-15 — Phase 6 AI Generation

### 已完成

- 安装并锁定官方 `@fal-ai/client@1.10.1`；生产 Adapter 仅使用该 SDK 的 Queue `submit`、`status`、`result` 与 Storage `upload` API，未添加 Mock Provider。
- 将三个模态收敛到 Server Allow-list：`fal-ai/flux/schnell`（Text → Image）、`fal-ai/kling-video/v2.1/standard/image-to-video`（Image → Video）和 `fal-ai/minimax/speech-02-hd`（Text → Speech）。每个入口具备独立的严格输入、Result Mapping 与安全 HTTPS URL 限制。
- 新增已登录 Image Upload Route；仅接受 JPEG/PNG/WebP、最大 10 MiB，真实 fal Storage 成功后才写入 `media_assets` metadata，不会返回伪造 URL。
- 新增 HTTPS token-protected fal Webhook Route、Raw Body SHA-256、Repository 与 `202608150002_phase6_fal_lifecycle.sql`。callback receipt 以 Provider/External Task/Payload Hash 幂等保存，并创建 Outbox Event。
- 新增 Queue Status + Result Reconciliation；只有 fal 返回 `COMPLETED` 后才读取和映射 Result Asset。Provider terminal callback 目前仅保存证据，保留 task finalization 和 Credits Settlement 给 Phase 7 的同一事务。
- Vitest 的 `server-only` alias 只用于 Node 隔离测试解析 Next 的编译期标记；production build 仍使用 Next 的 server-only 边界。

### 实际检查

| Check                                | Result                                                               |
| ------------------------------------ | -------------------------------------------------------------------- |
| `format`                             | PASS — Prettier Check Exit 0                                         |
| `lint`                               | PASS — ESLint Exit 0，无 Warning                                     |
| `typecheck`                          | PASS — Strict TypeScript Exit 0                                      |
| `test`                               | PASS — Vitest 18 Files / 42 Tests；SDK Fake 仅用于隔离 Contract Test |
| `build`                              | PASS — Next.js Production Build；fal Upload/Webhook Route 编译成功   |
| 真实 Text → Image                    | PASS — Flux Schnell；真实 JPEG、External Task 与 Receipt             |
| 真实 Image → Video                   | PASS — Kling 2.1 Standard；真实 5 秒 MP4、External Task 与 Receipt   |
| 真实 Text → Speech                   | PASS — Minimax Speech 02 HD；真实 MP3、External Task 与 Receipt      |
| 真实 fal Webhook / Phase 6 Migration | PASS — 远端 Migration、3 个 Receipt 与原 Hash Replay 幂等验证        |

### 真实 fal 验收

- 在用户明确授权 `$5` 上限后，仅提交 `fal-ai/flux/schnell`、`fal-ai/minimax/speech-02-hd`、`fal-ai/kling-video/v2.1/standard/image-to-video` 各一次；没有重试或 fixture。
- Text → Image、Text → Speech 和 5 秒 Image → Video 均返回 `COMPLETED` 与真实 HTTPS Result。
- 三个 fal callback 均通过公开 ngrok HTTPS 地址进入远端 Supabase；三个真实 Receipt 使用原 payload hash 重放后全部返回 `was_replayed=true`，数据库事件总数保持 3。
- 首次 Image submit 后发现 `assert_generation_task_transition()` 错误调用另一个 trigger-only function。新增并远端应用 `202608150003_fix_generation_task_transition_trigger.sql`；随后按 External Task ID 恢复既有 Image，未重复提交或收费。
- 真实证据保存在 `docs/real-integration/phase6-real-2026-08-15t080854324z.json`。fal Usage Dashboard 显示 Kling `$0.28`、Minimax `$0.0036`、Flux `$0.003`，明细合计 `$0.2866`，页面显示 `$0.29`；低于 `$5` 上限，本地 Credits Effect 为 `0`。账单截图保存为 `docs/real-integration/phase6-fal-usage.png`。

### 阶段停止条件

Phase 6 代码、隔离测试、远端 Migration/Webhook 和三项真实 fal Integration 已完成。本轮在此停止，不进入 Phase 7 Credits。

## 2026-08-15 — Phase 7 Credits

### 已完成

- 基于 Phase 6 真实 fal 成本冻结 `production.credits.v1`：Image 30 Credits、5 秒 Video 2,800、10 秒 Video 5,600、Speech 每 10 字符 6 Credits；1 Credit 对应 USD 0.0001 Provider 成本基准。
- 新增 `202608150004_phase7_credits.sql`：不可变 Quote 快照、Reservation Allocation、Subscription 优先于 recurring Pack 的 Lot 锁定、幂等并发 Submit、Reserve Debit、成功 Settlement、失败 Compensation Credit 与 callback replay。
- 替换 Phase 5 的 Task-only Submit RPC；余额不足在真实 fal 调用前拒绝，Task/Reservation/Idempotency/Outbox/Ledger 在同一事务落库。
- fal callback 从 receipt-only 切换为原子 Receipt + Result/Failure + Credits Finalization；Provider 已接受但本地记录失败时进入 `reconciliation_required`，不错误退款。
- 新增 `/api/quotes`，接通 `/api/generate` 的 Quote/Reserve/fal Submit/Compensation，并为既有 Text → Image Studio 增加提交前确定报价。
- 新增 Pricing、Migration、Repository 隔离测试，以及 `pnpm test:real:credits` 真实 Supabase 事务验收脚本；脚本不调用 fal，不产生 Provider 费用。

### 实际检查

| Check                     | Result                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| `pnpm format`             | PASS                                                                |
| `pnpm lint`               | PASS — ESLint Exit 0                                                |
| `pnpm typecheck`          | PASS — Strict TypeScript Exit 0                                     |
| `pnpm test`               | PASS — 21 Files / 49 Tests                                          |
| `pnpm build`              | PASS — `/api/quotes`、Credits Generate 与 fal Finalization 编译成功 |
| 远端 Phase 7 Migration    | PASS — Supabase Dashboard SQL Editor                                |
| Digest Search Path Repair | PASS — `202608160001_fix_phase7_digest_search_path.sql`             |
| `pnpm test:real:credits`  | PASS — 真实 Supabase JWT/PostgREST，Provider Calls `0`              |

### 远端真实 Credits 验收

- 使用 Supabase Dashboard SQL Editor 应用 `202608150004_phase7_credits.sql`。首次执行发现 PostgreSQL 不允许 `CREATE OR REPLACE` 改变既有 `submit_generation_task` OUT Row Type；Migration 修复为先按精确签名删除 Phase 5 函数，再创建 Phase 7 版本。
- 首次脚本运行发现临时测试密码为 73 字符，超过当前 Supabase Auth 接受的 72 字符上限并表现为 Auth `500 Internal Server Error`；改为单个随机 UUID 后，临时用户创建与清理恢复正常。
- Quote RPC 首次真实调用发现 Supabase 的 `pgcrypto.digest` 位于 `extensions` schema；应用 `202608160001_fix_phase7_digest_search_path.sql` 后，Quote 与 Submit 的 Security Definer Search Path 可正确解析 `digest`。
- `pnpm test:real:credits` 最终 PASS。Evidence 为 `docs/real-integration/phase7-credits-2026-08-15t164751872z.json`，记录 `providerCalls=0`。
- 真实结果：Image Quote 30 Credits；零余额在 Provider 前阻断；并发相同 Key 返回同一 Task 且一次 Replay；Reserve 后 Subscription `0`、Pack `90`、Account `available=90/reserved=30`；Success Replay 后 `available=90/reserved=0`；Failure 后余额与 Pack 恢复，并保留 30 Credits Debit 与 30 Credits Compensation Credit。

### 阶段停止条件

Phase 7 代码、远端 Migration、真实 Supabase 并发、成功 Settlement、Failure Compensation 与 Ledger 对账均已 PASS。本轮在 Phase 7 完成后停止，不进入 Phase 8 Stripe。

## 2026-08-16 — Phase 8 Stripe

### 已完成

- 安装官方 `stripe@22.5.0`，只在 server-only Stripe Integration 中使用；未加入 Browser Stripe Secret 或 Mock 支付成功路径。
- 新增两个固定 Product Key 的 Test Mode Checkout Allow-list。服务端检索对应 USD recurring Price，并从 Stripe Price Metadata 的正整数 `credits` 读取每期发放数量。
- 新增受保护的 `/api/stripe/checkout`、最小账户 Checkout 入口和 `/checkout/return`。Return Page 只显示本地状态，不能发放 Credits。
- 新增 Raw Body `stripe-signature` Webhook、Test Mode Event Allow-list、Invoice Metadata Mapping，以及 `202608160002_phase8_stripe.sql`。
- 该 Migration 使用 Checkout Client Key、Stripe Event ID、Invoice ID 和 Payment/Ledger 唯一约束处理重放；只有 `invoice.paid` 在锁定 Credit Account 的事务中增加 Lot、Balance 和不可变 Ledger。
- 新增 Stripe Config、Price、Webhook、Repository、Migration Contract Tests；全部是明确隔离 fixture，不会调用 Stripe 或伪造 Demo 成功。

### 实际检查

| Check            | Result                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| `pnpm format`    | PASS                                                                   |
| `pnpm lint`      | PASS                                                                   |
| `pnpm typecheck` | PASS                                                                   |
| `pnpm test`      | PASS — 26 Files / 61 Tests                                             |
| `pnpm build`     | PASS — `/api/stripe/checkout`、`/api/webhooks/stripe`、Return 编译成功 |
| Stripe Sandbox   | PASS — Subscription、Pack、Cancel、Decline、3DS、Bank/Link 与 Replay   |
| 远端 Migration   | PASS — Supabase SQL Editor 已应用 `202608160002`–`202608160005`        |

### 真实 Sandbox 验收与修复

- 配置 Stripe Test/Sandbox 的两个 recurring Price：`subscription` 每期 25,000 Credits，`recurring_credit_pack` 每期 7,500 Credits；两者均由 Price Metadata 的 `credits` 驱动。
- 本地开发服务器运行于 `http://localhost:3001`，Stripe CLI 将已签名的 Test Event 转发至 `/api/webhooks/stripe`。Subscription 与 Recurring Credit Pack 各支付成功一次；Cancel 回到项目时未发放 Credits，Decline 未发放 Credits，3DS 和 Bank/Link Sandbox Payment 成功。
- `invoice.paid` 重放后返回成功且没有重复增加 Credits。两个并发到达的 `customer.subscription.created` 首次发生死锁，顺序重放后均成功处理。
- 首次 `invoice.paid` 发现 PostgreSQL 列名歧义，依次应用 `202608160003_phase8_stripe_invoice_paid_fix.sql` 和 `202608160004_phase8_stripe_column_resolution_fix.sql`。随后发现 Checkout completion 的时间戳可遮蔽 Stripe 更早创建的权威状态事件，应用 `202608160005_phase8_checkout_state_ordering_fix.sql`，将已付款但 pending 的 Subscription 修复为 active，未改动 Credits 或 Ledger。
- 最终远端核对：2 条 active `subscription`、2 条 active `recurring_credit_pack`、4 个 Stripe Credit Lot、4 条 Stripe Ledger Credit、可用余额 65,000 Credits、0 个 Stripe Event Processing Error；Cancel/Decline 的 2 笔 Payment 保持 pending 且无 Credit Lot/Ledger 发放。
- 质量检查：`pnpm lint`、`pnpm typecheck` 均 PASS；`pnpm test` 为 26 Files / 61 Tests PASS。脱敏结构化证据见 `docs/real-integration/phase8-stripe-2026-08-16t000000000z.json`。

### 阶段停止条件

Phase 8 的代码、隔离验证、Production Build、远端 Migration 与真实 Stripe Sandbox 验收均已 PASS。本轮严格停止在此，不进入 Phase 9 完整页面。证据仅保存脱敏的结构化记录；不提交 Secret、Webhook Signing Secret、邮箱、Checkout URL 或未脱敏命令行截图。

## 2026-08-16 — Phase 9 Main Pages / Studio

### 已完成

- 增加 Candidate M 的 Features、Models、Pricing、五个代表性 Landing，以及 FAQ/About/Contact/Privacy/Terms/Refund 公共路由；主导航、移动导航、Footer 和主 CTA 均使用内部路由。
- Studio 从仅有 Text → Image 的最小控件扩展为独立的 Text → Image、Image → Video、Text → Speech 表单；保留既有服务端 Input、Quote、Reserve 与 Generate 契约。
- Studio 覆盖游客登录引导、输入校验、报价、上传失败、余额不足、队列、对账和安全失败文案；不伪造 Provider 进度或成功结果。
- Account 在既有服务端 Guard 后只读读取 RLS 所有权范围内的 Credit Account、Generation History、Ledger、Payment 和 Subscription；为空或查询失败时展示明确状态。
- 未增加 Migration、外部依赖、支付产品、价格版本，亦未执行 fal 或 Stripe Sandbox 请求。

### 实际检查

| Check                 | Result                                                                              |
| --------------------- | ----------------------------------------------------------------------------------- |
| `pnpm format:write`   | PASS                                                                                |
| `pnpm lint`           | PASS — ESLint Exit 0                                                                |
| `pnpm typecheck`      | PASS — Strict TypeScript Exit 0                                                     |
| `pnpm test`           | PASS — 27 Files / 63 Tests                                                          |
| `pnpm build`          | PASS — Next.js 16.3.1 Production Build，27 static pages collected                   |
| Local HTTP Smoke      | PASS — `/`、`/studio`、`/pricing`、Landing、Support 200；`/account` 307 Login Guard |
| Manual Keyboard Smoke | PASS — 仅用 Tab/Enter 验证三模态入口、文本框焦点、窄屏菜单与登录引导                |

### 最小 Keyboard Smoke

- 人工在 `http://localhost:3001/studio` 仅使用 Tab/Enter 切换到 Video 与 Audio，确认对应独立表单出现，且焦点可进入 Audio 文本框。
- 人工在约 390px 宽度下仅使用 Tab/Enter 展开移动菜单，并从“创作”链接回到 Studio。
- 人工仅使用 Tab/Enter 激活“登录后获取报价”，确认进入 `/login?next=%2Fstudio`。该路径不登录、不上传、不创建 Quote、Task 或 Checkout。

### 阶段停止条件

Phase 9 的功能、路由、三模态 Studio、Account read model、质量检查与最小 Keyboard Smoke 已完成。本轮严格停止在此，不进入 Phase 10 SEO 或 Phase 11 视觉复刻。Creen 参考截图仍未取得，且此环境未提供可用的内置图片生成工具；视觉 Fidelity、人工响应式比较、axe 与完整 Accessibility 测试保持 `NOT EXECUTED`，不得标为 PASS。

## 2026-08-16 — Phase 10 SEO

### 已完成

- 增加统一 typed SEO helper：公开 Route 生成独立 Title、Description、Canonical、Open Graph、Twitter Metadata；本地无配置 fallback 对齐既有开发端口 `http://localhost:3001`。
- 为 Home、Features、Models、Pricing 和五个批准 Landing 建立独立 Metadata；动态公开 Slug 从 typed 内容生成 Metadata，未知 Slug 进入 Next 404。
- Landing Content 增加互异 Intent、关键词、可见 FAQ、相关内部链接和对应 JSON-LD；Models Content 收敛为三个已批准模态的 typed records，未新增 Programmatic SEO Route。
- 增加站点 Organization/WebSite JSON-LD、`sitemap.xml`、`robots.txt`、认证/账户/结账/Studio 的 noindex 边界，以及 `/create` 到 `/studio` 的永久兼容跳转。
- 未改动生成、Credits、Stripe、数据库、支付产品、价格或视觉范围。

### 实际检查

| Check                 | Result                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm format`         | PASS — 清理临时构建产物后全量检查                                                                                        |
| `pnpm lint`           | PASS                                                                                                                     |
| `pnpm typecheck`      | PASS — Strict TypeScript                                                                                                 |
| `pnpm test`           | PASS — 30 Test Files / 69 Tests                                                                                          |
| Production Build      | PASS — 使用隔离 `.seo-build` 完成；默认 `.next` 有遗留 Chrome Profile 文件锁，未结束用户浏览器进程                       |
| Production HTTP Smoke | PASS — Public Metadata/Canonical/JSON-LD、FAQ Schema、Robots、15 条 Sitemap URL、Private noindex、`/create` 308 均已验证 |

### 已知部署前置条件

- `NEXT_PUBLIC_SITE_URL` 在正式部署前必须设置为最终 Primary Domain 的 HTTPS URL；本地 fallback 仅用于 `localhost:3001` 开发。
- Next 16 在动态根布局下对未知 slug 使用流式 404，HTTP 响应可为 `200`，但返回 HTML 带 `noindex`；该行为符合本地 Next 文档，未知路径不会进入 Sitemap。

### 阶段停止条件

Phase 10 SEO 的代码、隔离契约和本地 Production HTTP Smoke 已完成。本轮严格停止在此，不进入 Phase 11 UI / Responsive Polish。

## 2026-08-16 — Phase 11 UI / Responsive Polish

### 已完成

- 统一 Home、Studio、Pricing、Auth、代表性 Landing 和 Account 的 Design Token、表面层级、响应式栅格、focus/hover/active/disabled 状态与 reduced-motion 表现；未改动生成、Credits、Stripe、数据库或 Auth 契约。
- Home 和代表性 Landing 引入真实本地媒体处理。通过用户授权的 `$10` 上限，调用现有 Phase 6 fal 的 Flux Schnell、Kling 5 秒 Image-to-Video 和 Minimax TTS；下载结果为 `public/media/phase11-studio.jpg`、`.mp4` 与 `.mp3`，页面不依赖临时 Provider URL。
- Studio tabs 补充 Arrow、Home 和 End 的 roving focus 交互；skip link 移入 header landmark，所有主内容目标可聚焦。减少动态效果时首屏视频暂停且隐藏，静态图片仍保留。
- 新增 Playwright/axe 测试与 Chromium 配置。测试使用独立 `.phase11-next` 生产构建目录，避免用户现有 `.next` 内 Chrome Profile 锁；测试产物被 Git 忽略。

### 实际检查

| Check                       | Result                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                 | PASS — ESLint Exit 0                                                                                                              |
| `pnpm typecheck`            | PASS — Strict TypeScript Exit 0                                                                                                   |
| `pnpm test`                 | PASS — Vitest 30 Files / 69 Tests                                                                                                 |
| `pnpm test:e2e`             | PASS — 隔离 Next Production Build + Chromium 14 passed；1440×960/390×844 Screenshot、Keyboard、axe、Reduced Motion、Account Guard |
| Screenshot 人工项目内审阅   | PASS — Home、Studio desktop/mobile 无重叠、无横向溢出，媒体与层级符合实现意图                                                     |
| Creen 源截图视觉对比        | Requires access — `docs/reference-screenshots/` 不存在，当前环境无可访问 Creen 浏览器                                             |
| 已登录 Account 人工视觉审阅 | Requires access — 自动验证仅覆盖安全 Login Guard，需受控登录测试会话                                                              |

### 阶段停止条件

Phase 11 的项目内 UI / Responsive Polish、真实媒体资产和自动化浏览器验证已完成。本轮严格停止在此，不进入 Phase 12 Testing。不得将缺少参考截图的项目内审阅描述为 Creen 源站像素级 Fidelity；后续需要批准的参考截图/浏览器访问及受控账户会话。

## 2026-08-16 — Phase 12 Testing

### 已完成

- 复核 Phase 1–11 的 Candidate M、Auth、fal、Credits、Stripe、页面和 SEO 范围；本阶段没有修改任何已冻结业务契约或新增产品能力。
- 新增 GitHub Actions 质量门禁，覆盖 format、lint、typecheck、Vitest、隔离 production build、Chromium E2E 和 production dependency advisory scan；真实 Provider 测试仍为显式、受凭据和预算保护的本地操作。
- 将本轮命令、浏览器测试、真实受控 Supabase Account 场景、安全审计，以及真实 Provider 与 isolated fixture/stub 的边界记录到 `docs/phase12-testing-evidence.md`。

### 实际检查

| Check                                          | Result                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format` / `pnpm lint` / `pnpm typecheck` | PASS — Prettier、ESLint 与 Strict TypeScript 均通过                                                                                   |
| `pnpm test`                                    | PASS — Vitest 30 files / 69 tests                                                                                                     |
| Production Build                               | PASS — 以 `NEXT_DIST_DIR=.phase12-next` 隔离构建；共享 `.next` 中既有 Chrome profile 锁使裸 `pnpm build` 无法清理旧文件，不是编译失败 |
| `pnpm test:e2e`                                | PASS — 独立 production build + Chromium 16 个场景；包含 1440×960/390×844、键盘、axe、媒体与 Guard                                     |
| Controlled Account E2E                         | PASS — 在网络授权后创建、登录并删除临时 Supabase 测试用户；不调用 fal 或 Stripe                                                       |
| `pnpm audit --prod --audit-level=high`         | PASS — No known vulnerabilities found                                                                                                 |
| Hosted CI / Full Secret Scan / License Scan    | NOT EXECUTED — workflow 已写入但本轮未触发；尚无可复现 secret/license scanner                                                         |

### 阶段停止条件

Phase 12 已收口本地 Unit、Integration、Contract、E2E、真实受控 Account Integration、Dependency Security 与 Build Evidence，并将既有 Google/fal/Stripe Sandbox 证据和 isolated fixture/stub 结果明确分离。Hosted CI、完整 Secret Scan 和 License Scan 保持 `NOT EXECUTED`。本轮严格停止在此，不进入 Phase 13 Final Review。

## 2026-08-16 — Phase 13 Final Review / Delivery Closeout

### 已完成

- 按招聘方五项原始要求完成最终 Traceability Review，结论写入 `docs/phase13-final-review.md`；没有新增或扩展 Candidate M 功能。
- 新增 `docs/deployment-notes.md`，固定 Node.js 部署命令、迁移责任边界、验收步骤和最终 Demo URL/账号所有权/独立验收环境的外部依赖。
- 更新 README、PRD、ADR 与测试矩阵，使历史真实集成、当前本地验证和未完成的线上交付条件不再混淆。
- 审阅非测试生产源文件：未发现 Production Mock/Fake/Stub 路径、死主 CTA 或 `any`；测试中的明确 fixture 与配置拒绝 live key 的测试值不属于生产路径。`.env.local` 仍被 Git 忽略，示例文件只含变量名。

### 实际检查

| Check                     | Result                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Clean Install             | PASS — 临时干净副本执行 `pnpm install --frozen-lockfile --offline` 成功                                                            |
| Format / Lint / Typecheck | PASS — `pnpm format`、`pnpm lint`、`pnpm typecheck` 均退出 0                                                                       |
| Migration Contracts       | PASS — `pnpm test` 中 30 files / 69 tests 通过；涵盖 Phase 5–8 SQL 合同                                                            |
| Isolated Production Build | PASS — `NEXT_DIST_DIR=.phase13-next pnpm build` 成功，生成 29 条路由                                                               |
| Production Smoke          | PASS — `pnpm test:e2e` 的独立构建与 16 个 Chromium 场景成功退出                                                                    |
| Manual Demo Rehearsal     | PASS — `PHASE11_ACCOUNT_VISUAL=1 node scripts/phase11-account-visual.mjs` 创建、登录并删除受控 Supabase 用户；未调用 fal 或 Stripe |
| Dependency Advisory       | PASS — `pnpm audit --prod --audit-level=high`：No known vulnerabilities found                                                      |

### 保留风险

- **R13-01 / Release blocker：** 未提供最终托管平台、公开 Demo URL、账号所有权移交或独立验收环境，故不声明线上部署完成。
- **R13-02 / Release risk：** Supabase CLI 未安装，未在隔离空数据库执行 migration history replay；现有 SQL contract 与历史远端应用证据通过，但发布前应由目标环境所有者执行一次干净库回放。
- **R13-03 / Assurance gap：** Hosted CI、完整 secret scanner、license scanner 未执行；本轮仅完成 `.gitignore`/模式审阅与 production dependency advisory。

### 阶段停止条件

Phase 13 已完成最终 Traceability Review、部署与交付收口。除非提供 R13-01 所列外部条件，不再扩展已冻结需求。

## 2026-08-17 — Hosted CI 状态同步

- GitHub Actions `Quality Gate #2` 在提交 `92b8885` 上实际触发并通过：格式、lint、typecheck、unit、production build、Chromium E2E 与 production dependency audit 均为绿色。
- 当前交付状态文档已同步 Q-006 为 `PASS`；空 Supabase 数据库完整 migration replay、完整 secret/license scanner、Google 异常真实 E2E 与 fal Provider 真实异常边界仍保持 `NOT EXECUTED`。
- Phase 12 与 Phase 13 中记录当时 Hosted CI 尚未执行的历史段落保留原文，不回写历史。
