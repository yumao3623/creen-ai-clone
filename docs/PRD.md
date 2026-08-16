# PRD — Creen.ai Clone

状态：**Candidate M 已确认，P0 范围已冻结**  
基线日期：**2026-08-14**

## 1. 问题与目标

独立实现一个 Creen.ai 复刻项目，用真实注册/登录、真实 Google 登录、真实跨模态 AI 调用与可审计 Credits、真实 Stripe Sandbox 支付、主要页面复刻、已落地的 SEO 逻辑和可追溯过程记录，证明完整 Web 产品交付能力。

目标不是复制每个已索引 URL、全部模型或受保护品牌资产，而是在 Candidate M 范围内代表性地复现核心产品、获客、计费与支付闭环。

## 2. 招聘方原始五项要求

项目最高优先级验收依据保持原文：

1. `要接入完整的注册、登录（一方和三方谷歌登录）`
2. `有完整的跨模态计费系统，要支持真实调用非 Mock`
3. `支持 Stripe 支付`
4. `各主要页面完整复刻，并且学习其 SEO 逻辑`
5. `保留过程记录`

原始题目为 `复刻 creen.ai 网站`。下列 Traceability ID 只负责把原始要求拆成可测试单元，不增加新的招聘方要求。

## 3. P0 — 原始明确要求

| ID    | 原始要求            | 验收含义                                                                         |
| ----- | ------------------- | -------------------------------------------------------------------------------- |
| P0-01 | 复刻 Creen.ai       | 按现有证据复刻 Candidate M 的主要产品与内容结构。                                |
| P0-02 | 完整注册            | 用户能以邮箱 + 密码真实注册并持久保存。                                          |
| P0-03 | 完整一方登录        | 注册用户能登录、Logout、保持 Session，并访问受保护能力。                         |
| P0-04 | Google 三方登录     | 真实 Google OAuth/OIDC 成功，基本失败/取消状态得到处理与验证。                   |
| P0-05 | 完整跨模态计费      | 三种模态共用可审计的报价、余额检查、预留、结算/补偿和 Ledger。                   |
| P0-06 | 真实调用、非 Mock   | Demo 路径调用三个真实 fal 模型并保存可验证的 Provider/Task 证据。                |
| P0-07 | Stripe 支付         | Stripe Hosted Checkout Sandbox 的两个确认商品真实贯通。                          |
| P0-08 | 主要页面完整复刻    | 确认页面满足内容、交互、状态与响应式验收；视觉未验证项不得虚报。                 |
| P0-09 | 学习并实现 SEO 逻辑 | URL、内容、内链与 Metadata 逻辑实际进入代码并可验证。                            |
| P0-10 | 保留过程记录        | Research、Requirements、Decisions、Plan、Implementation 与 Verification 可追溯。 |

## 4. P1 — 必要派生能力

| ID    | 派生能力                                     | 来源            | 必要性                                                              |
| ----- | -------------------------------------------- | --------------- | ------------------------------------------------------------------- |
| P1-01 | 持久化 User、Identity 与 Session             | P0-02/03/04     | 真实注册与两种登录方式需要持久身份状态。                            |
| P1-02 | 安全的一方凭据验证                           | P0-02/03        | 不能保存明文密码或只依赖客户端状态。                                |
| P1-03 | Google Callback、state/CSRF 与安全链接策略   | P0-04           | 单独一个 Google 按钮不能建立可信身份流程。                          |
| P1-04 | 受保护 Account/API、Logout 与过期处理        | P0-02/03/04     | 登录必须实际改变授权并能从 Session 过期恢复。                       |
| P1-05 | 服务端 AI Adapter 与 Secret 隔离             | P0-06           | Provider Key 不得进入浏览器。                                       |
| P1-06 | 跨模态统一 Generation Task                   | P0-05/06        | Image/Video/Audio 需要一致的归属、Lifecycle、Evidence 与 UI State。 |
| P1-07 | 版本化报价与不可变 Ledger                    | P0-05           | 每笔消费必须保留提交时使用的模型、参数和价格版本。                  |
| P1-08 | 幂等、预留/结算与失败补偿                    | P0-05/06        | 重试、并发、失败和重复 Callback 不得双扣或泄漏 Credits。            |
| P1-09 | Stripe 服务端集成与可信同步                  | P0-07           | Redirect 可伪造，权益只能由签名验证后的异步状态驱动。               |
| P1-10 | 页面/流程/复刻清单                           | P0-01/08        | “主要页面”必须有冻结清单和可验收标准。                              |
| P1-11 | 服务端可读公开页面与路由级 SEO               | P0-09           | SEO 需要 Crawlable Content、Metadata 与 Route Graph。               |
| P1-12 | Loading/Empty/Error/Success 与恢复状态       | P0-04/06/07/08  | 真实第三方服务异步且可能失败。                                      |
| P1-13 | 环境/Secret 分离与最小权限                   | P0-04/06/07     | 真实集成带来敏感凭据与 Callback。                                   |
| P1-14 | 可重复的 format/lint/typecheck/test/build/CI | P0-10 与全部 P0 | 用真实质量门禁回应第一题 B+ 反馈。                                  |
| P1-15 | 获得视觉证据后的人工响应式 QA                | P0-08           | 当前证据不足以支持像素或交互复刻结论。                              |
| P1-16 | Forgot / Reset Password                      | P0-02/03        | 作为 P1 完善密码登录恢复，但不阻塞 P0。                             |

## 5. 明确不属于当前 P0

- 强制邮箱验证、手机号、短信验证码、MFA；
- Guest Credit、匿名账户/余额与匿名 Credits 迁移；
- Admin、社区、分享、收藏、Referral、邀请奖励、Team Workspace、企业账号；
- 多 Provider、大量模型或强制模态串行；
- 多级会员、优惠券、Trial、复杂 Proration、Refund/Invoice 后台、税务、多币种；
- 大量 Programmatic SEO 页面、全量模型页或多语言页面；
- 与已确认规模无关的高级基础设施。

如果后续要加入其中任一项，必须先说明它对应哪条原始要求、为何必需以及是否存在更简单方案。

## 6. 已确认范围：Candidate M

### 6.1 页面

- Home；
- 统一 Studio/Create，含 Image、Video、Audio 三个模式；
- Features Hub 与代表性 Models 模板/页面；
- Pricing；
- Login / Register；
- Account：History/Saved、Credits/Usage、Subscriptions/Payments；
- `/ai-image-generator`、`/ai-video-generator`、`/text-to-image`、`/image-to-video` 和一个 Audio Landing Page；
- FAQ、About、Contact、Privacy、Terms、Refund；
- 404 与 Stripe Return 页面。

精确 Header、响应式行为和视觉 Token 需参考截图或可访问浏览器后冻结。

### 6.2 认证与匿名策略

- 一方方式：邮箱 + 密码；三方方式：真实 Google OAuth。
- P0：Register、Login、Google Login、Logout、Session Persistence、基本错误与必要 Route/API Guard。
- 游客可浏览公开页面和 Studio，也可填写 Prompt/选择上传；真实 Generate 必须先登录。
- Forgot / Reset Password 为 P1；邮箱验证不是 P0 强制项。

### 6.3 AI 与 Generation

分别实现且允许独立使用：

1. Text → Image；
2. Image → Video；
3. Text → Speech。

使用 fal 单 Provider，每种模态一个真实模型。三个模型的准确 ID 在 AI Implementation 前按可用性、成本、稳定性、等待时间和官方文档做一次小范围确认，当前为 `TBD / Requires credentials`。

### 6.4 Credits

- 单一 User Credit Balance 与不可变 Credit Transaction/Ledger；
- 不同 Generation 可配置不同 Credits 成本；
- Generate 前显示价格并检查余额；
- 不足时禁止真实调用；
- 成功后结算，失败不错误扣费；
- Image/Video/Audio 共用同一任务与计费体系。

### 6.5 Stripe

- 环境：Stripe Sandbox / Test Environment；
- 一个正常 Subscription 商品；
- 一个 recurring Credit Pack；
- 使用 Stripe Hosted Checkout；
- 服务端签名 Webhook 更新 Payment/Subscription 与 Credits；
- 浏览器 success URL 不能成为发放 Credits 的可信依据。

## 7. 代表性 Demo 路径

1. 游客从可抓取 Landing Page 进入 Studio。
2. 选择任一模态并填写输入；点击 Generate 时进入 Login/Register。
3. 完成邮箱密码登录；Google 登录在独立验收路径中真实验证。
4. 服务端展示版本化 Credits 报价并检查统一余额。
5. 余额不足时进入相应 Stripe Sandbox Hosted Checkout。
6. 返回页显示 Pending，直到签名 Webhook 更新本地可信状态与 Credits。
7. 提交一次真实 fal Generation，保存 Provider Task Reference 与 Result Reference。
8. 在 History/Usage 查看任务、价格版本、实际扣费与 Ledger。
9. 验证重复提交、Provider 失败和 Webhook 重放不会造成重复扣费。

## 8. 主要页面复刻验收

- **结构：** Route、Navigation、Content Hierarchy、主要 CTA 与关键 Section 符合已观察页面族。
- **行为：** 关键 Control 与 Route Transition 可用，不存在无响应的主 CTA。
- **状态：** 覆盖 Loading/Empty/Error/Success，以及未登录、Credits 不足、取消和重试。
- **响应式：** 在批准的 Desktop/Tablet/Mobile Viewport 完成人工与截图比较。
- **视觉：** 字体、间距、密度、颜色、媒体、Border/Radius/Shadow/Motion 必须由参考证据推导。
- **内容/法律：** 使用本项目原创文案与资产，复现信息逻辑而非擅自复制受保护内容。

在获得视觉证据并约定容差前，不能以“Pixel Perfect”作为已通过标准。

## 9. SEO 验收

- 主要公开 Route 可被服务端读取；
- 每页独立 Title、Description、Canonical 与单一语义 H1；
- `features/{slug}`、`models/{slug}` 通过 Typed Content 和复用模板生成已批准页面；
- Landing Page 有真实差异化内容、FAQ 与相关工具内链；
- 实现并验证 `robots`、`sitemap`、404、Redirect 与 Index Boundary；
- 私有 Account、Callback、Checkout Return、Job Detail 与 API 不进入索引；
- 首版单一主要语言并保持 i18n-ready，Locale 与 `hreflang` 仍为 P2/TBD。

## 10. 数据持久化范围

必须持久保存 User/Auth Identity、Generation、Modality、Model、Input Metadata、Status、Credit Cost、Provider Task Reference、Result Reference、时间戳、Credit Balance/Ledger，以及必要 Stripe Customer/Subscription/Payment Reference。

媒体文件是否长期保存取决于 fal URL 生命周期和 History 验收。若必须长期保存，优先评估 Supabase Storage；该具体策略仍为 `TBD`，但不得以临时 URL 假装满足长期 History。

## 11. 外部条件与仍未确认项

- `Requires credentials`：Supabase 项目、Google OAuth Client、fal API Key、Stripe Sandbox Account/Keys/Webhook Secret。
- `Requires budget`：三个真实 fal 模型的小额验证与最终 Demo 调用。
- `Requires access`：Creen 当前视觉截图、交互与响应式证据；可由用户提供 `docs/reference-screenshots/`。
- `TBD`：三个 fal Model ID、媒体长期保存方案/期限、Deployment Platform/Region、同邮箱 Identity Collision 细节、最终视觉 Token 与容差。
- 未授权 Live Stripe 收款；不得使用 Live Key。

以上未决项不阻塞 Project Scaffold/Foundation，但会在相应 Implementation 阶段成为进入条件。

## 12. Phase 13 交付判定

Phase 13 仅对本 PRD 的五项原始要求做 Traceability Review，不改变 Candidate M、P0/P1 或非范围。每项必须链接到代码、测试或真实集成 Evidence；无法在本地自主完成的部署事项必须保留清晰 Risk Label，不能以本地服务或历史证据冒充最终线上验收。

最终结论与风险位于 `docs/phase13-final-review.md`，发布前外部条件位于 `docs/deployment-notes.md`。
