# PRD - Creen.ai Clone

## 产品定位

Creen 是一个统一 AI 创作工作区。用户可在同一账户中创建图片、短视频和语音，使用统一 Credits 计费，并在账户页查看生成历史、余额和支付状态。

项目交付覆盖以下原始目标：复刻 Creen.ai 的主要页面与 SEO 逻辑，提供完整的邮箱密码与 Google 登录，支持真实跨模态生成和计费，支持 Stripe 支付，并保留可追溯的过程记录。

## 产品目标

产品将图片、视频和语音入口放在同一个可登录、可计费、可追踪的工作区中。用户可以从公开内容页开始探索，在 Studio 中准备输入，确认本次 Quote 后提交真实生成，并在 Account 中核对任务、Credits 和支付状态。

## 用户场景

| 用户               | 目标                 | 完成路径                                                   |
| ------------------ | -------------------- | ---------------------------------------------------------- |
| 访客               | 了解产品并开始创作   | 从公开页面进入 Studio，填写输入后登录                      |
| 已登录创作者       | 生成图片、视频或语音 | 获取 Quote，确认余额，提交异步任务，查看结果与历史         |
| Credits 不足的用户 | 补充可用 Credits     | 从账户页选择 Stripe Sandbox Checkout，等待可信支付状态更新 |
| 回访用户           | 管理创作与支付记录   | 在 Account 查看任务、Ledger、Subscription 与 Payment 状态  |

## 核心用户流程

### 创作流程

1. 访客从 Home、Features、Models 或 Landing Page 进入 Studio，也可以直接访问 `/studio`。
2. 用户选择 Image、Video 或 Audio，填写对应输入；Image-to-Video 需要先上传参考图片。
3. 未登录用户在获取 Quote、上传参考图片或 Generate 时进入 Login/Register，并携带安全的站内 `next` 路径。
4. 登录用户获取与输入参数匹配的 Quote；余额不足时在调用 Provider 前收到阻断提示。
5. 用户点击 Generate 后，系统先预留 Credits，再把任务提交到 Provider；页面显示 Queued 或 Reconciliation required，并提示到 Account 查看最终状态。
6. Webhook 完成可信状态更新后，Account 的最近任务、Credits 账本和结果状态可供核对。

### 付款流程

1. 用户从 Pricing 了解模态价格，进入 Account 的 Billing 区域。
2. 用户选择 Subscription 或 recurring Credit Pack，应用创建 Stripe Hosted Checkout 并跳转到 Stripe。
3. 用户返回 Checkout Return 后看到 Paid、Canceled、Failed 或 Pending；Pending 期间等待签名 Webhook。
4. 只有可信支付事件更新 Payment、Subscription、Credit Lot 和 Ledger，用户再回到 Account 查看余额。

## 产品范围

### 页面与信息架构

| 页面/端点         | Route                                                                                                | 访问条件                               | 核心用途                              | 主要操作                              |
| ----------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------- | ------------------------------------- |
| Home              | `/`                                                                                                  | 公开                                   | 介绍统一工作区和三种能力              | 进入 Studio、查看 Pricing             |
| Studio            | `/studio`                                                                                            | 公开浏览；Quote/Upload/Generate 需登录 | 准备三模态输入并提交任务              | 切换模式、填写、上传、Quote、Generate |
| Create Redirect   | `/create`                                                                                            | 公开                                   | 兼容创作入口                          | 重定向至 `/studio`                    |
| Features          | `/features`                                                                                          | 公开                                   | 展示三条创作路径                      | 进入 Studio                           |
| Models            | `/models`                                                                                            | 公开                                   | 展示当前固定模型和模态                | 查看模型用途                          |
| Pricing           | `/pricing`                                                                                           | 公开                                   | 展示模态 Credits 基准                 | 进入 Account                          |
| Marketing Landing | `/ai-image-generator`、`/ai-video-generator`、`/text-to-image`、`/image-to-video`、`/text-to-speech` | 公开                                   | 搜索意图内容、示例和 FAQ              | 进入 Studio、浏览相关页面             |
| Support/Legal     | `/faq`、`/about`、`/contact`、`/privacy`、`/terms`、`/refund`                                        | 公开                                   | 帮助、公司说明和法律信息              | 阅读内容、使用内链                    |
| Login             | `/login`                                                                                             | 未登录优先                             | 建立邮箱密码或 Google 会话            | 登录、Google、去 Register             |
| Register          | `/register`                                                                                          | 未登录优先                             | 创建邮箱密码账户                      | 注册、Google、去 Login                |
| OAuth Callback    | `/auth/callback`                                                                                     | OAuth 回调                             | 处理 Google code 或错误并返回站内路径 | 完成会话交换或显示错误                |
| Account           | `/account`                                                                                           | 已登录                                 | 查看身份、余额、任务、账本和支付      | 退出、开始新创作、选择 Checkout       |
| Checkout Return   | `/checkout/return`                                                                                   | 已登录                                 | 显示支付确认状态                      | 返回 Account                          |
| 404               | 未匹配路由                                                                                           | 公开                                   | 处理不存在页面                        | 返回 Home                             |
| SEO 端点          | `/robots.txt`、`/sitemap.xml`                                                                        | 公开                                   | 提供抓取边界和公开 URL                | 供搜索引擎读取                        |

### Studio

Studio 提供三个独立模式：

- `Text-to-Image`：输入图片描述并选择图像尺寸；
- `Image-to-Video`：上传参考图片，输入视频描述并选择 5 秒或 10 秒时长；
- `Text-to-Speech`：输入朗读文本，可选声音标识。

访客可浏览 Studio 和填写输入。获取可信 Quote、上传参考图片和提交真实生成需要登录。每次输入变更都会使已有 Quote 失效，避免按过期或不匹配的参数提交。

输入限制来自当前服务端校验：图片 Prompt 最多 2,000 个字符；视频 Prompt 最多 2,000 个字符；语音文本最多 5,000 个字符；声音标识最多 128 个字符；参考图片仅支持 PNG、JPG、WebP，最大 10 MB。图片尺寸支持 `square`、`square_hd`、`portrait_4_3` 和 `landscape_4_3`。

Quote 期间显示确定的 Credits 成本和有效期。点击 Generate 后，Studio 显示提交中、队列中、余额不足或错误信息；最终 Provider 状态和失败代码在 Account 最近任务中呈现，当前 Studio 不内嵌结果预览或下载操作。

### Auth

- 支持邮箱密码注册、登录、会话保持与退出；
- 支持 Google OAuth；
- 注册包含邮箱、密码和确认密码；密码至少 8 个字符；登录包含邮箱和密码；
- Account、Quote、上传、Generate 和 Checkout 仅限已登录用户；
- 未登录的生成入口跳转到 Login，并保留安全的站内返回路径；已登录用户访问 Login/Register 会回到该路径；
- 退出仅结束当前设备会话，并可从 Account 或 Header 操作。

### Generation 与 Credits

- 三种模态通过 fal.ai 执行真实生成，不使用生产 Mock 结果；
- 用户先获取与输入参数绑定、有效期 15 分钟的 Credits Quote；
- 提交时系统检查余额、创建任务并预留 Credits；
- Provider 成功时结算，失败时补偿；
- Generation、Quote、Reservation、Lot 和 Ledger 共同形成可审计记录；
- 相同用户、操作和请求键的重试返回持久化结果，不重复创建任务或扣费；
- 用户同时拥有 Subscription 与 Credit Pack 时，优先消耗 Subscription Credits。

### Pricing 与 Stripe

- Stripe 使用 Hosted Checkout Sandbox；
- 商品仅限一个 Subscription 和一个 recurring Credit Pack；
- 服务端读取并验证 Test Price 与其 `credits` metadata，浏览器不传金额、Price ID 或 Credits 数量；
- Checkout Return 只显示支付状态，不能发放 Credits；
- 仅 Stripe 签名 Webhook 产生可信 Payment、Subscription 和 Credits 更新。

### Account 与 History

Account 显示当前身份（邮箱、登录方式和 User ID）、可用与已预留 Credits、最近任务、不可变 Ledger、付款记录和订阅状态。最近任务展示模态、模型、状态、时间和失败代码；账本展示原因、时间和 Credit 增减；付款与订阅展示商品、状态、每期 Credits 和当前周期。用户只能访问自己的数据，页面提供退出和开始新创作入口。

### SEO 页面

公开页面按搜索意图提供差异化内容、相关工具内链和 FAQ。每个公开页面有独立 Title、Description、Canonical 与单一 H1；公开路由进入 Sitemap，账户、回调、Checkout Return、Studio 与 API 不进入索引。

## 非范围

- Stripe Live Mode、真实收款与退款处理；
- 匿名 Credits、访客余额或匿名余额迁移；
- MFA、手机号登录、团队工作区、管理员后台、邀请与 Referral；
- 多 Provider、多币种、优惠券、税务、复杂订阅变更与账单后台；
- 全量模型目录、全量程序化 SEO、多语言与 `hreflang`；
- 独立媒体长期归档服务。

## 业务规则

1. 真实生成只在认证、输入校验和 Quote 校验通过后开始。
2. 余额不足时，系统在调用 fal.ai 前拒绝生成。
3. 成功任务必须有结果引用和结算记录；失败或取消按状态机处理预留与补偿。
4. 任务状态未知时进入对账状态，不能凭猜测再次扣费或释放 Credits。
5. Credits 使用整数最小单位；账本记录不可修改或删除。
6. 支付权益只来自签名验证、幂等且满足时序规则的 Stripe 事件。
7. 公开页面可索引；账户和交易流程不索引。

## 异常状态

| 场景                            | 用户可见表现                                         | 用户可执行操作                          |
| ------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| 未登录或会话过期                | 跳转 Login，并显示需要登录或会话过期提示             | 登录、注册后返回安全站内路径            |
| 输入无效                        | 字段错误或请求错误提示，任务不会提交                 | 修正输入后重新获取 Quote                |
| Quote 不可用/过期/参数不匹配    | 无法提交确定报价                                     | 修改输入并重新 Quote                    |
| Credits 不足                    | 显示余额不足，真实生成未提交                         | 前往 Account 选择支付商品               |
| 图片上传失败                    | 显示格式、大小或上传不可用提示                       | 更换 PNG/JPG/WebP 图片或稍后重试        |
| Provider 提交失败               | 显示安全错误并释放/补偿预留                          | 使用新的请求再次尝试                    |
| Provider 已接受但本地状态待对账 | 显示 Reconciliation required，避免重复提交           | 到 Account 等待可信状态                 |
| 支付取消或失败                  | Checkout Return 显示 Canceled/Failed，不增加 Credits | 返回 Account，重新选择商品              |
| Webhook 延迟                    | Checkout Return 显示 Pending                         | 等待服务端确认，不以 URL 参数判断已付款 |
| 重复提交或重复 Webhook          | 返回既有任务或 replay，不重复扣费/发放               | 继续查看 Account 状态                   |

错误信息不暴露 Secret、原始 Provider 敏感内容或支付凭据。

## 验收标准

- 用户可完成邮箱密码注册、登录、退出和 Google OAuth，并访问受保护账户；
- 三种模态均可提交真实 fal.ai 任务，并保留可信任务和结果证据；
- Credits Quote、预留、结算、补偿、幂等和账本在真实数据库验收中可对账；
- Stripe Sandbox Checkout、签名 Webhook、取消/失败/重放与 Credits 发放规则可验证；
- 主要公开页面、Studio、Pricing、Account 与 Support/Legal 页面可访问并具备响应式和关键状态；
- SEO 元数据、Sitemap、Robots、Redirect、私有路由索引边界可验证；
- 调研、决策、实施、测试和真实集成证据在过程记录中可追溯。
