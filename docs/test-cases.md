# 测试矩阵与验收结果

本文件只记录当前交付版本的验收事实。状态含义：`PASS` 表示已有执行证据，`FAIL` 表示执行后未满足预期，`NOT EXECUTED` 表示尚未执行，不能以推断替代。

## 结果摘要

| 状态         | 数量/结论                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------- |
| PASS         | 认证、真实 AI、Credits、Stripe Sandbox、SEO、UI、构建、浏览器主要路径与 Hosted CI 均有通过记录 |
| FAIL         | 0                                                                                              |
| NOT EXECUTED | 空数据库完整 migration replay、完整 secret/license 扫描，以及部分第三方异常边界                |

真实集成脱敏证据目录：[docs/real-integration](real-integration)。过程验证记录见 [evidence-index.md](evidence-index.md)。

## Source Evidence 与基础门禁

| ID     | 检查                                                                    | 状态         | 证据/限制                                                    |
| ------ | ----------------------------------------------------------------------- | ------------ | ------------------------------------------------------------ |
| X-001  | Creen 公开页面、页面族和 SEO 内容调研                                   | PASS         | 公开抓取内容与证据索引                                       |
| X-002a | 参考截图驱动的 Home、Studio、Pricing、Auth、Landing 与 Account 视觉审阅 | PASS         | 参考截图、Playwright 截图与受控 Account 会话                 |
| X-002b | Creen 源站 DOM、响应式和登录后 UI 直接采集                              | NOT EXECUTED | 源站访问限制；不以推测替代                                   |
| X-003  | Creen 真实生成、支付和完整 Auth UI 观察                                 | NOT EXECUTED | 需要源站访问与账户权限                                       |
| X-004  | fal、Supabase Auth、Stripe Sandbox 官方能力调研                         | PASS         | 官方文档与证据索引                                           |
| F-001  | Install、Strict TypeScript、环境变量和 Secret Ignore 检查               | PASS         | Lockfile、`tsconfig`、`.env.example`                         |
| F-002  | Lint、Typecheck、Foundation Unit、Production Build                      | PASS         | 本地质量门禁                                                 |
| F-003  | Foundation 视觉复刻检查                                                 | PASS         | 后续参考截图、响应式、键盘、axe、媒体和 Account 审阅证据覆盖 |

## 核心业务测试用例

以下用例从现有 Vitest、Playwright、真实集成记录和受控人工验收中整理，保留与招聘要求直接相关的操作级证据。

| Test ID | 模块                            | 类型                      | 前置条件                                  | 操作步骤                                                                              | 预期结果                                                       | 状态         | 证据                                             |
| ------- | ------------------------------- | ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| C-001   | Email 注册/登录/退出            | Real Integration + E2E    | Supabase 已配置，使用受控邮箱             | 注册；必要时确认邮箱；登录；刷新；退出；再次访问 Account                              | 会话持久化；退出后 Account 受保护并回到 Login                  | PASS         | `docs/authentication.md`；真实 Auth 验收         |
| C-002   | Google OAuth                    | Real Integration + E2E    | Google Test User 与 Redirect 已配置       | 点击 Google；完成 Consent、Callback；进入 Account                                     | Provider Identity 显示 Google，Session 可用                    | PASS         | `docs/authentication.md`；真实 Google 证据       |
| C-003a  | Google callback 安全边界        | Unit/Contract             | OAuth callback 路由可访问                 | 发送取消和不安全 `next` 的 callback                                                   | 映射稳定错误并限制为站内返回路径                               | PASS         | `src/app/auth/callback/route.test.ts`；U-002     |
| C-003b  | Google 异常 E2E                 | Real E2E                  | Google Test User 与真实 OAuth 可用        | 执行真实 Cancel、Invalid callback/state、Callback error 和同邮箱冲突路径              | 每个边界有真实可复核结果；这些场景尚未执行                     | NOT EXECUTED | `docs/authentication.md`；E-003                  |
| C-004   | 游客 Studio 与 Generate Guard   | Integration + E2E         | 未登录、公开页面可用                      | 访问 Studio；填写输入；尝试 Quote/Generate；访问 Account                              | Studio 可浏览；受保护操作跳转 Login；未认证 API 返回安全错误   | PASS         | `src/integrations/supabase/proxy.test.ts`；E-005 |
| C-005   | Text-to-Image                   | Real Integration          | 受控 Supabase 用户和 fal 凭据             | 创建受控任务上下文；提交 fal Queue；等待完成；读取 Image Result；等待 Webhook Receipt | 真实 Image Task 完成，保存 Task/Result/Receipt，Credits 可对账 | PASS         | [fal 真实证据](real-integration)；R-001          |
| C-006   | Image-to-Video                  | Real Integration          | Text-to-Image 已有 HTTPS Result           | 以真实 Image Result 作为输入；提交 5 秒 Video；等待完成；读取 Result 和 Receipt       | 真实 5 秒 Video 完成并保留 Webhook/Result 证据                 | PASS         | [fal 真实证据](real-integration)；R-002          |
| C-007   | Text-to-Speech                  | Real Integration          | 受控 Supabase 用户和 fal 凭据             | 提交文本和 voice setting；等待完成；读取 Audio Result 和 Webhook Receipt              | 真实 Audio 完成，保留 Result 证据                              | PASS         | [fal 真实证据](real-integration)；R-003          |
| C-008   | Quote 与参数一致性              | Unit/Database Integration | 已认证用户                                | 对三模态请求获取 Quote；改变输入或等待过期后提交旧 Quote                              | 返回确定成本；过期或不匹配 Quote 不可提交                      | PASS         | `pricing.test.ts`；Credits migration contract    |
| C-009   | Credits 不足                    | Real Database Integration | 账户可用余额低于 Quote 成本               | 获取 Quote；提交 Generate                                                             | 返回 `409 insufficient_credits`，Provider 未被调用             | PASS         | [Credits 真实证据](real-integration)；I-003      |
| C-010   | Duplicate Submit                | Real Database Integration | 同一用户、同一 Client Key 和 Request Hash | 并发或重复提交同一请求                                                                | 返回同一 Task/Reservation，不重复调用或扣费                    | PASS         | [Credits 真实证据](real-integration)；I-002      |
| C-011   | Success Settlement              | Real Database Integration | 已完成并预留 Credits 的任务               | 处理成功 callback，再 Replay 同一 callback                                            | 只结算一次；Reservation 归零；Ledger 可核对                    | PASS         | [Credits 真实证据](real-integration)；I-003      |
| C-012   | Failure Compensation            | Real Database Integration | 已预留 Credits 的失败任务                 | 处理 Provider failure callback                                                        | 原 Lot 恢复；保留 Reserve Debit 与 Compensation Credit         | PASS         | [Credits 真实证据](real-integration)；I-003      |
| C-013   | Stripe Subscription             | Stripe Sandbox E2E        | 已登录用户和 Test Price                   | 从 Account 选择 Subscription；完成 Hosted Checkout；等待 Webhook                      | Payment/Subscription 为可信状态，每期 25,000 Credits 入账      | PASS         | [Stripe 真实证据](real-integration)；S-001       |
| C-014   | Stripe recurring Credit Pack    | Stripe Sandbox E2E        | 已登录用户和 Test Price                   | 选择 recurring Credit Pack；完成 Checkout；等待 Webhook                               | 每期 7,500 Credits 入账，Account 可见记录                      | PASS         | [Stripe 真实证据](real-integration)；S-002       |
| C-015   | Stripe 取消、拒付与 3DS         | Stripe Sandbox E2E        | Stripe Sandbox 测试场景                   | 分别执行 Cancel、Card Decline、3DS、Bank/Link                                         | Cancel/Decline 不发 Credits；成功场景进入可信状态              | PASS         | [Stripe 真实证据](real-integration)；S-003/S-004 |
| C-016   | Stripe Webhook Replay           | Stripe Integration        | 已有已处理 `invoice.paid`                 | 重放同一事件并发送乱序事件                                                            | 返回 replay；不重复创建 Lot/Ledger，较新状态不被覆盖           | PASS         | [Stripe 真实证据](real-integration)；S-005/S-006 |
| C-017   | Account Ownership 与 History    | Database + E2E            | 两个受控用户；一个用户有任务和账本        | 分别访问 Account；查看任务、账本、Payment/Subscription                                | 每个用户只能看到自己的记录；Account 可读取最近任务和账户区域   | PASS         | RLS/真实 Credits 验收；受控 Account 渲染         |
| C-018   | SEO 页面                        | E2E/Contract              | Production build 可运行                   | 检查公开页面 HTML、Metadata、Canonical、JSON-LD、Sitemap、Robots、404、Redirect       | 公开 URL 可抓取；私有页面不索引；结构化数据与可见内容一致      | PASS         | Q-001/Q-003；`src/lib/seo.test.ts`               |
| C-019   | Mobile、Keyboard、Accessibility | E2E + Manual              | Chromium Production Server                | 以 1440x960、390x844 访问页面；用 Tab/Arrow/Home/End 操作 Studio；运行 axe            | 页面无横向溢出；Tab 切换、焦点、媒体和 axe 检查通过            | PASS         | `tests/phase11-ui.spec.ts`；E-006/E-008          |

## Unit 与 Contract

| ID    | 检查                                                             | 状态 | 证据                                              |
| ----- | ---------------------------------------------------------------- | ---- | ------------------------------------------------- |
| U-001 | Email/Password 校验、环境变量和错误映射                          | PASS | `src/domain/auth/*test.ts`、`src/config/*test.ts` |
| U-002 | Google OAuth callback、取消和安全 Redirect                       | PASS | `src/app/auth/callback/route.test.ts`             |
| U-003 | Auth、Account、Generate 访问策略                                 | PASS | `src/domain/auth/access.test.ts`                  |
| U-004 | 三模态输入、模型 Allow-list、Provider Payload                    | PASS | `src/domain/generation/*test.ts`                  |
| U-005 | Generation 状态转换与结果引用约束                                | PASS | `src/domain/generation/state.test.ts`             |
| U-006 | Credits 价格、字符计费和参数规则                                 | PASS | `src/domain/credits/pricing.test.ts`              |
| U-007 | fal Config、Upload 限制、Webhook Token 与结果解析                | PASS | `src/integrations/fal/*test.ts`                   |
| U-008 | Stripe Test Mode、Product Metadata、Webhook Signature 与事件映射 | PASS | `src/integrations/stripe/*test.ts`                |
| U-009 | Database、RLS、Generation、Credits、Stripe migration contracts   | PASS | `src/db/*migration-contract.test.ts`              |

## Integration 与 Database

| ID    | 检查                                                              | 状态         | 证据                                                  |
| ----- | ----------------------------------------------------------------- | ------------ | ----------------------------------------------------- |
| I-001 | Supabase SSR Session、Proxy 和公开/受保护路由                     | PASS         | `src/integrations/supabase/proxy.test.ts`；HTTP Smoke |
| I-002 | 真实 RLS Ownership、并发 Reservation 与重复提交                   | PASS         | 两个受控用户、真实 JWT/PostgREST 验收                 |
| I-003 | Credits Success Settlement、Failure Compensation、Lot/Ledger 对账 | PASS         | [真实 Credits 证据](real-integration)                 |
| I-004 | Webhook Receipt、Hash、Outbox 与重复 Callback 幂等                | PASS         | Repository/SQL Contract 与真实回调记录                |
| I-005 | 空数据库按完整 migration history 回放                             | NOT EXECUTED | 当前远端数据库已有应用记录，未在隔离空库重建          |

## E2E 与 UI

| ID    | 检查                                                       | 状态         | 证据                                                                       |
| ----- | ---------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| E-001 | Email Register/Login/Logout/Refresh 与 Session Persistence | PASS         | 真实测试邮箱、本地 Production Server                                       |
| E-002 | Google Consent/Callback/Provider Identity                  | PASS         | Google Test User、本地 Production Server                                   |
| E-003 | Google Cancel、Invalid State、Callback Error、同邮箱策略   | NOT EXECUTED | 未有独立真实边界执行记录                                                   |
| E-004 | 公开路由、Studio、Pricing、Landing、Support/Legal 可达     | PASS         | Production HTTP Smoke                                                      |
| E-005 | 未登录 Account Guard、Generate Guard 与安全错误            | PASS         | `/account` 返回 307；Generate 未认证被拒绝                                 |
| E-006 | Studio 三 Tab、表单焦点、窄屏导航和 Auth CTA 键盘流程      | PASS         | Playwright 与人工键盘 Smoke                                                |
| E-007 | Desktop/Mobile 响应式截图、媒体和 reduced motion           | PASS         | Playwright：15 个 Chromium 场景通过；1 个受控 Account 场景因未提供凭据跳过 |
| E-008 | axe 检查、语义结构和 Skip Link                             | PASS         | Playwright axe 与页面检查                                                  |
| E-009 | Provider Rate Limit、Timeout、Moderation、Failure 安全错误 | NOT EXECUTED | 未进行额外真实 Provider 异常调用                                           |

## Real Integration

| ID    | 类型             | 检查                            | 状态 | 结果                                                     |
| ----- | ---------------- | ------------------------------- | ---- | -------------------------------------------------------- |
| R-001 | Real Integration | fal Text-to-Image               | PASS | 真实 Image、Task、Webhook Receipt 和 Result              |
| R-002 | Real Integration | fal Image-to-Video              | PASS | 真实 5 秒 Video、Task、Webhook Receipt 和 Result         |
| R-003 | Real Integration | fal Text-to-Speech              | PASS | 真实 Audio、Task、Webhook Receipt 和 Result              |
| R-004 | Real Integration | fal 三次回调 Replay             | PASS | 三次回调均返回 replayed，不重复处理                      |
| R-005 | Real Integration | 真实 Provider 费用核对          | PASS | fal Usage 合计 USD 0.2866，页面四舍五入显示 USD 0.29     |
| R-006 | Real Integration | Google OAuth 成功路径           | PASS | Consent、Callback、Session、Provider Identity 与 Account |
| R-007 | Real Integration | Supabase Credits 成功/失败/并发 | PASS | 30 Credits Quote；Success 单扣；Failure 补偿；余额可对账 |

## Stripe Sandbox

| ID    | 检查                                        | 状态 | 结果                                |
| ----- | ------------------------------------------- | ---- | ----------------------------------- |
| S-001 | Subscription Hosted Checkout 与签名事件     | PASS | Active；每期 25,000 Credits         |
| S-002 | recurring Credit Pack Hosted Checkout       | PASS | 每期 7,500 Credits                  |
| S-003 | Cancel、Card Decline                        | PASS | 均未发放 Credits                    |
| S-004 | 3DS、Bank/Link Sandbox Payment              | PASS | 成功完成                            |
| S-005 | `invoice.paid` Replay 与重复事件            | PASS | 无重复 Lot/Ledger；事件处理错误为 0 |
| S-006 | Out-of-order Event 与 Subscription 状态时序 | PASS | 最终状态为可信 `active`             |
| S-007 | Browser Return URL 直接发放 Credits         | PASS | 不发放；只有签名 Webhook 更新余额   |

## SEO、Build 与 Release

| ID    | 检查                                                                    | 状态         | 证据                                                 |
| ----- | ----------------------------------------------------------------------- | ------------ | ---------------------------------------------------- |
| Q-001 | 每个公开页面的 Title、Description、Canonical、H1                        | PASS         | Typed SEO Contract 与 Production HTML                |
| Q-002 | Robots、Sitemap、Noindex、404、Redirect、Internal Link                  | PASS         | Sitemap 公开 URL、私有边界与 `/create` Redirect      |
| Q-003 | Organization/WebSite JSON-LD 与可见内容一致                             | PASS         | Server HTML Contract                                 |
| Q-004 | `pnpm format`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` | PASS         | 本地质量门禁；Production Build 成功                  |
| Q-005 | Chromium E2E                                                            | PASS         | 15 个场景通过；1 个受控 Account 场景因未提供凭据跳过 |
| Q-006 | Hosted CI Workflow 实际触发                                             | PASS         | GitHub Actions `Quality Gate #2` 在 `92b8885` 上通过 |
| Q-007 | 完整 Secret 与 License Scanner                                          | NOT EXECUTED | 生产依赖 advisory 检查通过，完整扫描未配置/执行      |
| Q-008 | Real 与 Stub/Fixture 证据分离                                           | PASS         | 生产路径无 Mock 结果；隔离 fixture 单独记录          |

## 线上 Smoke

Production URL、公开路由、SEO 端点、Google OAuth 到 Account、未登录 Generate Guard 和 Stripe Webhook 均有线上通过记录。真实 fal 生成和真实 Stripe Checkout 不在每次 smoke 中重复执行，以避免无必要的外部成本。
