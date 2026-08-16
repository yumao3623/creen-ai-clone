# 交互与视觉设计

本文描述当前交付版本的页面结构、交互、状态和响应式行为。视觉复刻以已提供的 Creen 参考截图、本地页面审阅和可访问性验收为依据；不延伸为未取得线上页面的逐像素承诺。

## 页面结构与导航

全站使用统一 Header、主导航、账户入口和 Footer。桌面导航连接 Home、Studio、Features、Models、Pricing；移动端使用可展开菜单。Header 提供跳转主要内容的 Skip Link，Footer 提供 FAQ、About、Contact、Privacy、Terms、Refund。

公开页面包括 Home、Features、Models、Pricing、代表性生成 Landing Page 和 Support/Legal 页面。Studio 通过 `/studio` 提供创作入口，`/create` 重定向到 `/studio`。Login、Register、Account 与 Checkout Return 属于流程页面；Account 和 Checkout Return 要求有效会话。

## Home

Home 的首屏由统一 Header、Hero 标题与说明、`进入 Studio` 和 `查看 Credits` 两个 CTA 组成。Hero 下方复用 Studio Composer 作为快速创作入口，游客可以查看和填写输入。

随后是三张带媒体的能力卡片：`Text to Image`、`Image to Video`、`Text to Speech`。Audio 卡片额外提供语音样本播放器。页面底部的 Workspace 区域列出版本化 Quote、独立模态和账户记录三项产品信息，最后由全站 Footer 收束。当前 Home 没有独立 FAQ 区块。

## Landing 与内容页

Landing Page 采用一致的内容层级：搜索意图 H1、创作入口或示例、能力说明、使用步骤、相关模型和参数、相邻工具内链、FAQ 与 Footer。不同页面使用不同标题、描述、关键词和内容，不以重复文本填充 URL。

## Features 与 Models

Features 页面使用一个标题区和三张能力卡片，分别说明 Image、Video、Audio 的创作路径；每张卡片都提供进入 Studio 的 CTA。Models 页面使用列表式模型内容，展示三种模态对应的服务端固定模型、用途和简要说明；页面不提供浏览器侧的模型选择或价格编辑。

## Studio 三模态

Studio 以同一工作区承载三个独立 Tab：

| 模式  | 输入               | 关键参数     | 结果/状态路径                        |
| ----- | ------------------ | ------------ | ------------------------------------ |
| Image | 图片描述           | 图像尺寸     | fal 任务，最终状态在 Account History |
| Video | 参考图片、运动描述 | 5 秒或 10 秒 | fal 任务，最终状态在 Account History |
| Audio | 朗读文本           | 可选声音标识 | fal 任务，最终状态在 Account History |

Tab 切换会清除不匹配的报价。用户可以在登录前浏览和填写表单；获取 Quote、上传参考图片和 Generate 会触发登录要求。提交区域显示 Quote、Credits 成本和任务状态。

Composer 的具体交互如下：Image 模式显示 Prompt 和图像尺寸；Video 模式显示参考图片上传、运动描述和 5/10 秒单选；Audio 模式显示朗读文本和可选声音标识。Quote 未获取时显示“获取报价”或访客的“登录后获取报价”，Quote 获取后显示成本并启用 Generate。Studio 当前不会在本页展示生成媒体；任务进入队列后提示到 History 查看最终状态。

## Pricing

Pricing 页面展示三种模态的 Credits 基准：Text-to-Image 每次 30 Credits、Image-to-Video 5 秒/10 秒分别为 2,800/5,600 Credits、Text-to-Speech 每 10 个字符 6 Credits。页面的主要 CTA 是进入 Account；Subscription 和 recurring Credit Pack 的实际 Checkout 按钮位于 Account 的 Billing 区域，而不是 Pricing 页面。

## Auth

Login 和 Register 使用同一套 Auth Panel。两页都有返回首页和关闭入口、Google CTA、邮箱表单、状态消息以及互相切换链接。Login 表单包含邮箱和密码；Register 另外包含确认密码。提交时按钮显示 loading 并禁用，字段错误就地显示。成功后按安全的 `next` 站内路径跳转，缺省路径为 Account；注册项目若要求邮箱确认，会先显示确认提示。

## Account

Account 首先显示头像首字母、邮箱、登录方式和 User ID，并提供退出当前会话。Overview 依次显示可用/已预留 Credits、最近任务、Credits 账本、订阅与付款。最近任务最多展示最近 12 条，账本最多展示最近 12 条，付款和订阅分别展示最近 8 条；无记录时显示 Empty 状态及可执行入口。账户数据读取失败时显示安全错误，不把部分读取结果当成最终可信状态。

## Auth、Pricing 与 Account

- Login/Register 共享一致的表单布局、字段标签、错误提示和成功跳转；Google 登录使用独立 CTA；
- Pricing 展示三种模态的 Credits 基准并链接到 Account；Subscription 与 recurring Credit Pack 的 Stripe Sandbox 按钮位于 Account Billing 区域；
- Account 按区域展示余额、预留 Credits、Generation History、Credits Ledger、Payment 和 Subscription；数据只显示当前用户拥有的记录；
- Checkout Return 显示 Paid、Canceled、Failed 或 Pending。Pending 期间明确提示等待可信 Webhook，不把浏览器返回当作付款成功。

## 状态设计

### 页面级状态

所有异步页面提供 Loading、Empty、Error 和 Success 状态。404 与错误页提供可返回公开页面的操作；未配置第三方凭据时，公开页面仍可渲染，受保护操作显示安全的不可用状态。

### Studio 状态

Studio 当前 UI 直接呈现以下状态：

| 状态                    | 页面表现                                     | 用户可执行操作            |
| ----------------------- | -------------------------------------------- | ------------------------- |
| Idle                    | 显示表单、尚未获取报价和 Quote/Generate 操作 | 修改输入、获取 Quote      |
| Requires authentication | 跳转 Login，并带 `/studio` 返回路径          | 登录或注册                |
| Quoting                 | 操作按钮显示处理中并禁用重复提交             | 等待报价或稍后重试        |
| Invalid input / Error   | 表单或结果区域显示可执行错误                 | 修正输入、重新 Quote      |
| Insufficient credits    | 显示“真实生成未提交”并提供 Account 入口      | 进入 Account 补充 Credits |
| Submitting              | Generate 按钮显示提交中并锁定                | 等待服务端响应            |
| Queued                  | 结果区域显示任务已提交和 History 提示        | 离开页面或到 Account 查看 |
| Reconciliation required | 说明 Provider 已接受但状态正在对账           | 等待可信状态，不重复提交  |

Provider 的 `processing`、`succeeded`、`failed` 等终态由 Account 最近任务中的状态和失败代码呈现；当前 Studio 没有单独的实时结果预览状态。

### 支付状态

Checkout 对用户显示 Pending、Paid、Canceled、Failed 和 Webhook delayed。支付成功和 Credits 变更只在服务端可信事件确认后展示。

## 页面状态对照

| 页面            | Loading              | Empty                           | Error                               | Success/终态                                            |
| --------------- | -------------------- | ------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| Auth            | 提交按钮显示正在提交 | 不适用                          | 字段错误、认证服务错误、Google 错误 | 成功后跳转，注册确认可能显示成功提示                    |
| Account         | 服务端页面加载       | 无任务、无账本、无付款/订阅记录 | 部分账户记录无法读取                | 余额、任务、账本和支付状态可读                          |
| Checkout Return | Pending 文案         | 不适用                          | Failed 或 Canceled 文案             | Paid 文案，Credits 已由 Webhook 写入                    |
| Studio          | Quoting、Submitting  | 未获取 Quote 的初始状态         | 输入、上传、Provider 或预留错误     | Queued/Reconciliation required 提示；最终状态在 Account |

## 响应式布局

Desktop 使用双栏或多栏工作区，Composer、结果区和报价区保持清晰层级；Tablet 收拢导航和参数面板；Mobile 使用纵向 Composer、结果和提交区，文件上传、Auth、Pricing 和长内容保持可滚动且不横向溢出。验收视口包括 1440x960、1024x768 和 390x844。

## Keyboard 与 Accessibility

- 语义化 Heading、Landmark、Label、Tablist、Tabpanel 和表单错误关联；
- Studio Tab 支持 Arrow、Home、End 键切换，焦点移动到激活 Tab；
- Skip Link、可见 Focus、按钮 Disabled 状态和 `aria-live` 状态消息覆盖主要路径；
- 图片、视频和音频使用合适的替代文本或装饰性空 Alt；
- 支持 reduced motion，状态信息不只依靠颜色表达；
- Home axe 检查、桌面/移动浏览器场景和最小键盘流程均已验证。
