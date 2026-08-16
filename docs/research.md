# 调研（Research）— Creen.ai Clone

状态：**调研基线，不代表产品验收通过**  
调研日期：**2026-08-14**  
访问条件：未登录；无 Creen、Google、AI Provider 或 Stripe Credentials  
环境：Codex Desktop，Asia/Shanghai

## 1. 方法与证据规则

调研前已完整阅读仓库根目录 `task2-handoff/01`–`08`。初始 Prompt 写的是 `docs/task2-handoff/`，实际目录位于仓库根目录。

调研使用：

1. 搜索抓取器获得的 Creen 当前官方 URL 与 2026-08-13/14 抓取内容；
2. In-app Browser 直接访问尝试；
3. HTTP `HEAD` 检查；
4. fal、Replicate、Google Vertex AI、Supabase Auth、Better Auth、Clerk、Stripe、Next.js 与 Playwright 官方文档。

证据标签：

- **Observed**：直接存在于当前公开 HTML、Response Header 或官方文档。
- **Inferred**：由一个或多个观察推导，不代表招聘方原话。
- **Unknown**：未找到可靠证据。
- **Requires access**：受 Cloudflare、登录/支付状态、Credentials、预算或账号所有权阻塞。

未把任何生成结果、Google Callback、支付、响应式断点或登录后页面描述成已验证。

## 2. 访问限制

**Observed：** 搜索抓取器能够读取 Home、Create、Features、Pricing、FAQ、核心 Landing Page、Model、Legal/Support 等公开内容，并显示 2026-08-13/14 抓取日期。

**Observed：** 对 `/`、`/create`、`/pricing`、`/robots.txt`、`/sitemap.xml` 的直接 `HEAD` 请求均返回 Cloudflare `403`；In-app Browser 无法从 `about:blank` 成功完成导航。证据见 C-017/C-018。

**影响：** 可以调研内容和 URL 清单，但 Layout Fidelity、Screenshot、Dynamic Interaction、Logged-in Behavior 和精确 Head Metadata 不能验收。视觉冻结前必须获得允许访问的浏览器路径或用户提供的参考截图。

## 3. 产品定位与用户路径

| 结论                                                                               | 分类                      | 证据                      | 对范围的影响                                             |
| ---------------------------------------------------------------------------------- | ------------------------- | ------------------------- | -------------------------------------------------------- |
| Creen 将自己定位为浏览器中的统一 Image/Video/Audio 创作工作区，并宣传 40+ Models。 | Observed                  | C-001、C-003              | 复刻应突出统一 Studio 与模态切换。                       |
| 公开文案多次表示无需注册即可开始，部分模型有较大每日免费额度。                     | Observed                  | C-001、C-005、C-006–C-012 | 说明其获客路径低门槛，但不覆盖本项目已确认的 Auth Gate。 |
| FAQ 表示 Account 可保存 Project、管理 Creation 和使用更多能力。                    | Observed                  | C-005                     | Account/History 是合理主流程。                           |
| 招聘方明确要求完整一方与 Google 登录。                                             | Original/P0               | Handoff 01/07             | 项目必须实现完整 Auth，不能只照搬 Creen 无登录入口。     |
| 当前确认策略为游客可探索 Studio，但真实 Generate 前登录。                          | Accepted project decision | ADR-006                   | 不实现匿名真实生成或 Guest Credit。                      |

公开内容直接或间接面向 Individual Creator、Designer、Marketer、Educator、Small Business 和 Professional Creative Team。页面围绕 Social Media、Ecommerce、Storyboard、Education 与 Personal Media 等具体工作流把搜索用户引导到 Studio。

## 4. 页面与路由清单

| 页面族                | 已观察 Route / Example                                                                                                 | 目的                                                                            | Candidate M 处理                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| Home / Discovery      | `/` 与 `/ca`、`/es-419` 等 Locale Root                                                                                 | 产品承诺、Gallery、Workflow、Model、Social Proof、FAQ、Footer                   | Home 为主要页面；Locale 为 P2/TBD          |
| Unified Studio        | `/create`                                                                                                              | Create/Edit、Model Card、Explore/Trending/Video/Image/Saved、Templates/Uploaded | 实现 Image/Video/Audio 三模式              |
| Feature Directory     | `/features`                                                                                                            | Video/Image/Audio/Edit 分类目录                                                 | 实现 Features Hub                          |
| Modality Landing      | `/ai-video-generator`、`/ai-image-generator`、`/text-to-video`、`/image-to-video`、`/text-to-image`、`/image-to-image` | Search Intent Landing + Creation Entry                                          | 实现 Candidate M 的代表性页面              |
| Feature Long-tail     | `/features/ai-animation-generator`、`/features/ai-headshot-generator`、`/features/text-to-speech` 等                   | Programmatic/Editorial SEO                                                      | 只实现代表性 Template/Slug                 |
| Model Long-tail       | `/models/kling-ai`、`/models/grok-imagine` 及 Locale Variant                                                           | Model Intent 与比较内容                                                         | 实现代表性 Model Template，不复刻全量      |
| Commercial            | `/pricing`、`/subscriptions`                                                                                           | Plan、Credits、Subscription                                                     | Pricing 为主要页面；Account 内呈现必要状态 |
| Company/Support/Legal | `/about-us`、`/contact-us`、`/faqs`、`/privacy`、`/terms`、`/refund-policy`                                            | Trust、Support、Policy、Footer Graph                                            | Candidate M 包含                           |
| Auth/Account          | Login/Register、Account/History                                                                                        | 招聘方要求和持久化闭环                                                          | Candidate M P0                             |

### 4.1 Header 与 Footer

**Observed：** Footer 具有 Legal（Privacy/Terms）、Support（Contact/FAQ/Refund Policy）、Resources（About/iOS/Android）、公司身份、地址、描述和支付卡图片等稳定链接图。

**Unknown：** Header 视觉结构、Sticky、Mobile Menu、Active State 和 CTA 精确位置，必须标为 `Requires access`。

### 4.2 国际化

**Observed：** 存在 `/ca`、`/es-419`、`/fr`、`/pt-BR`、`/ru`、`/pl`、`/id`、`/da` 等 Locale 前缀内容。

**Inferred：** Localization 是 Creen SEO 扩张策略之一。当前已确认单一主要语言 + i18n-ready，不实现全量 Locale。

## 5. 创作流程与模态

公开内容描述的可观察流程：

1. 无需账号进入 Studio；
2. 选择 Image、Video 或 Audio；
3. 输入 Text Prompt，并按能力上传一个或多个 Reference；
4. 选择 Model 与 Parameters；
5. Paid Model 在确认前显示 Credits 成本；
6. 提交异步 Generation；
7. Preview、Regenerate/Switch Model、跨模态复用、Save/Download/Export。

步骤 1–5 及预期结果操作来自公开内容；Processing UI、Callback、Cancel、Error 与 Success Control 为 `Requires access`。本项目基于确认决策在第 6 步前增加 Auth Gate。

| 转换                             | Creen 公开支持                                                      | 本项目范围                   |
| -------------------------------- | ------------------------------------------------------------------- | ---------------------------- |
| Text → Image                     | 11 个 Image Model、Aspect Ratio、Seed/Negative Prompt、最高 4K 宣称 | P0，一个真实 fal 模型        |
| Image → Image                    | Upload、Multi-reference、Restyle/Edit                               | 不属于当前三个 P0 模态       |
| Text → Video                     | 多模型、9:16/16:9/1:1、5–10 秒、最高 1080p 宣称                     | 不作为当前代表 Video 能力    |
| Image → Video                    | 突出的 Cross-modal Flow 与 Output Chaining                          | P0，一个真实 fal 模型        |
| Text → Speech / Sound / Song     | Audio Directory 与三个可发现 Route                                  | P0 仅 TTS，一个真实 fal 模型 |
| Video Edit/Extend/Character Swap | Features 中 Edit 分组                                               | P2                           |

公开 Model Label 包括 Sora、VEO、Seedance、Wan、Kling、Hailuo、Vidu、Grok、Nano Banana、GPT Image、MiniMax 与 Gemini TTS 等，但这不能证明 Creen 的后端 Provider，也不代表本项目有权复用品牌。

## 6. Auth 观察与确认

- **Observed：** Creen 公开文案表示开始使用不需要 Account。
- **Observed：** Account 用于保存和管理 Creation。
- **Requires access：** Creen Register Field、Password/Passwordless、Email Verification、Reset、Google Button、Consent、Callback、Logout、Session、Linking 和 Error State。
- **本项目 Accepted：** Supabase Auth；邮箱 + 密码；Google OAuth；Logout、Session Persistence、基本错误和 Access Control；真实 Generate 前登录。
- **P1：** Forgot/Reset Password。
- **非 P0：** 强制 Email Verification、Phone/SMS、MFA、Enterprise/Team Account。

## 7. Pricing、Credits 与 Payment

### 7.1 Creen 公开商业行为

- Pricing 有 `Monthly`、`Annual`、`Credit Packs` Tab。
- Pro 文案为每月 USD 29 或年付 USD 174；Annual Tab 标记 `-60%`，FAQ 却称节省 40%，存在矛盾，不能擅自统一。
- Subscription Credits 每周期刷新且不 Rollover。
- Credit Pack Credits 累积且不过期。
- 两者同时存在时，公开文案表示先消耗 Plan Credits，再消耗 Pack Credits。
- Generation Cost 取决于 Model、Resolution 与 Duration，并在确认前展示。
- Upgrade 立即生效且由 Stripe Prorate；Downgrade 下周期生效。
- Subscription 与 Credit Pack 被描述为独立 Recurring Subscription。
- Refund Page 与 Pricing 对 Add-on Credit 术语并不完全一致。

### 7.2 本项目确认范围

- 三种模态共用统一 Credits Balance、Quote、Reservation、Settlement/Compensation 与不可变 Ledger。
- Stripe Hosted Checkout Sandbox 接入一个正常 Subscription 和一个 recurring Credit Pack。
- Webhook 服务端状态是唯一可信发放依据；Return URL 不直接发放 Credits。
- 不实现完整 Plan Matrix、Coupon、Trial、复杂 Proration、Refund/Invoice 后台、Tax 或 Multi-currency。

## 8. 状态与响应式

| 区域       | Observed                                                     | 尚未观察 / 后续要求                                          |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Discovery  | Gallery Card、Load More、Create Similar、长内容、FAQ         | Hover/Focus、Skeleton、Empty/Error、Animation                |
| Studio     | Create/Edit Image、Model Card、Tab、Templates/Uploaded Label | 实际 Form Layout、Disabled/Loading/Error/Success、Validation |
| Job        | 公开文案给出典型耗时                                         | Queue Position、Progress、Cancel、Retry、Moderation Failure  |
| Billing    | Submit 前 Quote 文案与 Lifecycle FAQ                         | Insufficient Balance、Webhook Delay、Checkout Return State   |
| Responsive | 宣称支持 Desktop/Tablet/Mobile/Browser                       | 实际 Breakpoint、Mobile Menu、Studio Stack、Media Viewer     |

候选验证 Viewport 为 1440×900、1024×768、390×844；这不是已观察事实，最终以参考截图为准。

## 9. SEO 观察

### 9.1 Observed

- 使用描述性 Root Route 覆盖 Modality 和 Transformation Search Intent。
- Feature 使用 `/features/{slug}`，Model 使用 `/models/{slug}`。
- Locale 前缀复制 Content Cluster。
- Home、Pricing、Features、FAQ、Generator、Model、About、Contact、Policy 有 Route-specific Search Title。
- 抽样页面公开 HTML 有清晰 H1 和多个 H2/H3。
- Landing Page 包含说明、步骤、能力、Use Case、Model List、Claim/Testimonial、FAQ 和相邻工具内链。
- Footer 构成稳定 Trust/Support Link Graph。
- 抓取器能读取大量正文，说明公开内容可抓取；不能据此判断 SSR、SSG 或其他框架。

### 9.2 Unknown / Requires access

精确 `description`、Canonical、`hreflang`、Open Graph/X、JSON-LD、Robots、Sitemap、404/Redirect 和 Rendering Framework。

### 9.3 可学习逻辑

每个 Route 对应一个强 Search Intent；Hub-and-Spoke Internal Linking；复用但内容差异化的 Landing Template；FAQ/Support 深度；Model/Feature Cluster；Locale Variant；Server-readable Content。无需复制长营销文案、Testimonial、Trademark、Logo 或全量 Locale。

## 10. AI Provider 对比结论

| 候选                      | 能力 / 生命周期                                                               | 成本与数据                                                                                       | 结论                                                                |
| ------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| fal Model APIs            | Image/Video/Audio 广；Queue + Webhook；并发与额度随账号变化                   | 按 Image/MP/Video Second/Request；官方说明 Successful Output Billing；IO 默认保存并提供控制      | 已选单 Provider，准确 Endpoint/Price/Terms/Retention 仍需小范围验证 |
| Replicate Official Models | 广泛 Image/Video；Audio 逐模型确认；Prediction Lifecycle、Webhook/SSE/Polling | Official Model 单位较明确；失败通常不收费，Cancel 可能收费；API Input/Output 默认一小时删除      | 仅保留研究备选，不进入当前实现                                      |
| Google Vertex AI          | First-party Imagen/Veo；更宽 Audio 需其他服务                                 | Imagen 约 USD 0.02–0.06/Image；Veo 约 USD 0.50/s 或带 Audio USD 0.75/s；Quota/Retention 控制明确 | 治理强但成本高、集成分散，不进入当前实现                            |

## 11. Auth 与 Stripe 候选结论

- Supabase Auth：已选。真实 Email/Password、Google、Session 与 Managed Postgres 集成，减少手搓安全基础设施。
- Better Auth：App-owned、TypeScript-first，但安全、邮件与 Linking 工作更多；不进入当前实现。
- Clerk：成熟托管 Flow，但 UI/Data Lock-in 更高；不进入当前实现。
- Stripe Hosted Checkout Sessions：已选 Sandbox 路径，代码量和安全边界适合当前范围。
- Embedded Checkout/Payment Element：视觉连续性更好但状态和 QA 更复杂；当前不采用。
- Payment Intents 自定义 Checkout：控制更强但实现与 Lifecycle 负担过大；当前不采用。

## 12. 数据、测试与文档依据

- Supabase PostgreSQL/Storage 研究支持见 T-007。
- Next.js App Router、Metadata 与文件约定见 T-008。
- Playwright Visual Snapshot 策略见 T-009。
- 所有 URL 与官方来源的 Evidence ID 见 `evidence-index.md`。

## 13. 调研结论

1. Creen 的核心是统一 Generative Media Studio 加大规模 SEO 获客表面。
2. Candidate M 以代表性完整取代全量 URL/Model/Locale 堆积。
3. 当前 P0 为真实 Text → Image、Image → Video、Text → Speech，三者共享 Task 与 Credits。
4. 游客可探索，但真实 Generate 前登录。
5. Stripe Sandbox 证明 Subscription 与 recurring Credit Pack 两条真实 Hosted Checkout/Webhook 路径。
6. fal 是当前唯一实现 Provider；准确模型和预算仍需凭据验证。
7. Signed Webhook 驱动 Stripe Trust State，Browser Return 不可信。
8. Cloudflare 阻断使视觉与交互研究仍不完整；获得 Reference Screenshot 前不得宣称视觉 `PASS`。
