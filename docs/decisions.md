# 决策记录（ADR）

除非条目明确标为 `Accepted`，否则不得视为已确认。日期均为 2026-08-14。

## ADR-001 — 实施前完成调研与范围收口

- 状态：`Accepted`
- 来源：P0-10 与项目交接要求
- 决策：按 Research → Requirements → Scope → Architecture → Plan → Implementation 推进。
- 影响：前四阶段已经完成；本轮进入 Plan，并且首批实现只覆盖 Project Scaffold 与 Foundation。

## ADR-002 — 采用平衡范围 Candidate M

- 状态：`Accepted`
- 决策：采用 `PRD.md` 中的 Candidate M，以代表性页面、SEO 模板和三种真实模态证明完整闭环，不追求页面或模型数量。
- 影响：不把 Admin、社区、团队、多 Provider、大量模型、全量多语言或大量 Programmatic SEO 页面纳入 P0。

## ADR-003 — TypeScript 全栈基线

- 状态：`Accepted`
- 决策：采用 Next.js App Router + TypeScript 的模块化单体，配合 PostgreSQL。
- 原因：满足公开页面 SEO、Auth、Webhook、共享类型与工程成熟度要求，同时避免过早拆分服务。
- 约束：路由层保持轻量；领域逻辑、第三方适配与持久化边界必须清晰。

## ADR-004 — 认证方案

- 状态：`Accepted`
- 决策：采用 Supabase Auth、自定义 UI、邮箱 + 密码的一方注册/登录，以及真实 Google OAuth。
- P0：注册、登录、Google 登录、Logout、会话保持、基本错误处理与必要访问控制。
- P1：忘记密码 / Reset Password。
- 非 P0：强制邮箱验证；只有低成本且不阻塞核心 Auth 时再评估。
- TBD：同邮箱身份冲突的具体交互、会话时长与全设备退出策略。

## ADR-005 — AI Provider 与模态

- 状态：`Accepted with real integration verification pending`
- 决策：使用 fal 作为单一 AI Provider；分别实现 Text → Image、Image → Video、Text → Speech，每种模态只选一个真实模型。
- 约束：正式实现 AI 模块前，仅做一次小范围模型确认；生产路径不得以 Mock 冒充成功。
- Phase 6 代码模型：`fal-ai/flux/schnell`、`fal-ai/kling-video/v2.1/standard/image-to-video`、`fal-ai/minimax/speech-02-hd`。它们来自锁定 fal 官方客户端的 Endpoint Type Map；并不表示账户级请求已经通过。
- `Requires credentials / Requires budget`：三个模型的账户可用性、价格、区域可用性、商业条款、数据保留设置和真实调用结果。

## ADR-006 — 匿名访问边界

- 状态：`Accepted`
- 决策：游客可浏览公开页面、Pricing、SEO Landing Page，并可进入 Studio、填写 Prompt 或选择上传；真实 Generate 必须先登录。
- 影响：不实现 Guest Credit、匿名账户、匿名余额或匿名到注册用户的 Credits 迁移。

## ADR-007 — Credits 正确性模型

- 状态：`Accepted`
- 决策：三个模态共用版本化报价、事务性余额检查与预留、结算/补偿、不可变 Ledger 和幂等机制。
- 规则：余额不足禁止提交；成功后记录消费；失败不得错误扣费；所有变化可追溯。
- 约束：不增加积分过期、优惠券、Referral、企业共享余额等非必要规则。

## ADR-008 — Stripe 范围

- 状态：`Accepted`
- 决策：使用 Stripe Hosted Checkout Sandbox，接入一个正常 Subscription 商品和一个 recurring Credit Pack。
- 信任边界：浏览器 success URL 不发放 Credits；仅由签名验证后的 Stripe 服务端状态驱动账户与 Credits 更新。
- 非范围：Coupon、Trial、复杂 Proration、Refund/Invoice 后台、税务、多币种和复杂升降级。

## ADR-009 — 存储与异步基础设施按需引入

- 状态：`Accepted`
- 决策：先确认 fal 输出 URL 生命周期与 History 需求；需要长期保存时优先评估 Supabase Storage。
- 异步任务：先使用 fal Queue/Webhook、数据库 Outbox 与对账，不预先引入独立 Queue/Worker 平台。
- `TBD`：媒体是否必须长期持久化及其保留期限。

## ADR-010 — SEO 实施范围

- 状态：`Accepted`
- 决策：落实 Hub-and-Spoke 路由、可抓取内容、独立 Metadata、内部链接、FAQ/Support/Footer 结构，以及代表性 Feature/Model 模板。
- 约束：仅生成已批准 Slug；首版单一主要语言并保持 i18n-ready，不批量生成低质量页面。

## ADR-011 — 视觉冻结延后

- 状态：`Accepted limitation`
- 背景：当前网络访问 Creen.ai 返回 Cloudflare `403`。
- 决策：不得声称像素级复刻或虚构设计 Token；收到 `docs/reference-screenshots/` 等人工参考后再完成视觉冻结与视觉 QA。

## ADR-012 — 验证真实性

- 状态：`Accepted`
- 决策：只有真实执行且有证据的检查可记为 `PASS`。隔离测试可以使用明确标识的 Fake/Stub，但 Demo 生产路径和真实集成验收必须单独执行。
- 质量门禁：最终支持 `lint`、`typecheck`、`test`、production `build`；未执行项保持 `NOT EXECUTED`、`Requires access` 或 `Requires credentials`。

## ADR-013 — 最终交付以可追溯证据和风险标签为准

- 状态：`Accepted`
- 决策：Phase 13 只审查招聘方五项原始要求与既有 Candidate M，不增加功能。代码、文档和测试结论必须互相指向；未能由本工作区控制的最终 Demo URL、托管账号、独立验收环境和空库迁移回放，必须明确标为风险或外部依赖。
- 影响：历史真实 Google、fal、Stripe Sandbox 证据仍有效，但不会被表述为当前已部署线上 Demo；本地 `PASS` 也不替代独立发布环境的验收。
