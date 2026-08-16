# 设计方案

状态：**信息架构、状态设计与项目内视觉基线已按 Candidate M 收口；源站视觉 Fidelity 仍为 `Requires access`**  
视觉限制：**`docs/reference-screenshots/` 未提供，且当前环境没有可访问 Creen 的浏览器；不得声明源站视觉冻结或逐像素复刻**

## 1. 设计原则

1. 一个 Studio、三种模态，用户不应感觉在三个无关应用之间切换。
2. 公开浏览与 Studio 探索保持低门槛；真实 Generate 前要求登录。
3. 提交前明确展示模型、参数、Credits 报价和可用余额。
4. 将异步处理、失败恢复和刷新后状态保持视为主流程，而非边缘情况。
5. 公开内容必须可由服务端读取，并通过清晰内链连接相邻搜索意图。
6. 复刻布局逻辑和交互质量，不擅自复制商标、证言或长篇文案。

## 2. 已确认的信息架构

```text
公开区域
├─ Home
├─ Studio / Create
│  ├─ Image：Text → Image
│  ├─ Video：Image → Video
│  └─ Audio：Text → Speech
├─ Features Hub
├─ Models 代表性模板与页面
├─ Pricing
├─ 代表性 Landing Pages
│  ├─ /ai-image-generator
│  ├─ /ai-video-generator
│  ├─ /text-to-image
│  ├─ /image-to-video
│  └─ 一个 Audio Landing Page
├─ FAQ / About / Contact
└─ Privacy / Terms / Refund / 404

身份与账户
├─ Register
├─ Login
├─ Google callback / error
└─ Account
   ├─ History / Saved
   ├─ Credits / Usage
   └─ Subscription / Payment
```

Header 具体结构、移动端菜单、Logo 位置和精确视觉 Token 仍为 `Requires access`。

## 3. 统一 Studio

桌面端区域：

- 模态与模型选择；
- Prompt 与参考图片输入；
- 模型相关参数面板；
- Credits 报价与余额；
- Generate / Cancel / Retry 操作区；
- 结果与 History 画布。

三个模态互相独立，不强制 Image → Video → Audio 串行。登录、任务状态、Credits、History 与计费逻辑共用。游客可查看界面和填写输入；点击 Generate 时进入登录/注册引导，登录后再执行真实请求。

移动端候选布局为纵向 Composer + Result，并使用参数 Sheet。该交互尚未由 Creen 视觉证据验证，不能标为视觉 `PASS`。

## 4. Generation 状态

| 状态                    | 必要 UI 行为                                                          |
| ----------------------- | --------------------------------------------------------------------- |
| Idle                    | 说明可接受输入，展示默认模型和确定性报价或报价加载占位。              |
| Invalid input           | 就地给出可执行的校验提示；禁用提交时必须说明原因。                    |
| Requires authentication | 保留草稿并引导 Login/Register；不得先调用 Provider。                  |
| Quoting                 | 价格版本确定前禁止提交，不显示猜测成本。                              |
| Insufficient credits    | 保留草稿，展示所需/当前 Credits，并引导已确认的支付路径。             |
| Reserving               | 锁定重复提交，并展示可恢复的进度。                                    |
| Queued                  | 展示任务、模态/模型及非承诺式等待信息；Provider 支持时允许取消。      |
| Processing              | 刷新后仍可恢复，允许安全离开；没有 Provider 依据时不伪造进度百分比。  |
| Success                 | 预览、下载、可选跨模态复用、查看实际扣费并进入 History。              |
| Provider failure        | 展示安全错误、允许使用新幂等键重试，并明确未扣费或补偿状态。          |
| Timeout / unknown       | 说明正在对账；终态未确认前不得重复释放或扣费。                        |
| Moderation rejected     | 展示安全策略提示，不暴露原始 Provider 错误或 Secret，并说明扣费处理。 |

## 5. Auth 状态

Register/Login 必须覆盖：Idle、Validating、Submitting、成功跳转、无效凭据、重复邮箱、Google 取消、OAuth state/callback 失败、同邮箱冲突、Session 过期、Logout 和 Provider 不可用。

忘记密码 / Reset Password 为 P1；邮箱验证不作为 P0 阻塞项。

## 6. Credits 与支付状态

UI 必须区分：

- 可用、已预留和待对账 Credits；
- Subscription Credits 与 recurring Credit Pack Credits；
- 报价金额与最终结算金额；
- Checkout 已创建、Payment Processing、Paid、Canceled、Failed 和 Webhook Delayed；
- 内部 Provider 成本与用户 Credits 扣费。

支付返回页在服务端记录确认前只显示“正在确认支付”。任何 Query 参数都不得直接改变余额。

## 7. 公开 Landing Page 模板

根据已观察页面，采用以下代表性结构：

1. 对应搜索意图的 H1 与价值主张；
2. 创作入口或 Gallery/Examples；
3. 具体能力和可验证指标；
4. 简明步骤；
5. 支持的模型与参数；
6. 使用场景与相邻工具内链；
7. FAQ；
8. 共用的 Trust/Support Footer。

每个页面必须有真实不同的搜索意图与内容，不通过近似重复文案堆数量。

## 8. 响应式与视觉 QA

| 类型    | Viewport | 用途                            |
| ------- | -------- | ------------------------------- |
| Desktop | 1440×900 | 主要视觉复刻与 Studio 布局      |
| Tablet  | 1024×768 | 导航与面板收起行为              |
| Mobile  | 390×844  | Composer、支付、Auth 与长内容流 |

获得访问权限或参考截图后，至少采集 Home、Create、Pricing、Auth、Image/Video/Audio 各一个 Landing Page，以及可访问的 Account/Payment 状态，并提取颜色、字体、间距、圆角、阴影和动效 Token。在此之前，这些项均为 `TBD`。

## 9. Accessibility 基线

- 主要路径以 WCAG 2.2 AA 为目标；
- 语义化标题与 Landmark；
- 表单 Label 和可关联的错误说明；
- Studio、Dialog、Auth 与 Payment 入口支持完整键盘操作；
- 清晰 Focus，不仅依赖颜色表达 Credits/Error 状态；
- 支持 reduced motion；
- 媒体使用有效 Alt 或有意为空的 Alt；
- 当生成音视频承担信息表达时提供字幕或 Transcript。

## 10. 视觉复刻风险

- 视觉证据仍不足，第一批 Foundation 只能建立可替换 Token 与布局基础，不能宣称完成复刻。
- Creen 公共页面中的宣称、证言与商标不能在未确认权限时原样复制。
- Stripe Hosted Checkout 是外部页面，工程可信度优先于站内像素一致。
- 后续参考截图必须作为视觉实现与 QA 的事实依据；未验证项保持 `NOT EXECUTED`。
