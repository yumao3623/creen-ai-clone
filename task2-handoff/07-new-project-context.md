# Task 2 New Project Context

> 用途：复制到第二个独立 Codex 项目，作为不依赖第一题仓库的初始化上下文。  
> 版本：2026-08-14 handoff baseline。

## Project Background

这是第二道入职能力验证题。第一题是一个可运行的“微信小程序企业政府补贴资质预评估 Demo”，最终评价为 `B+`：“能胜任部分工作场景，正常实习生水平。”

第二题的目标不是在第一题上继续开发，而是创建一个全新的、独立的项目。第二题应吸取第一题在真实第三方集成、工程成熟度、UI/UX 打磨和测试完整性方面的教训，但不能因此擅自扩大产品需求。

## Original Assignment

题目提供方原文：

> 我在外地出差，所以我简单写一下虚构的这个场景需求。
>
> 需求说明：
>
> 复刻 creen.ai 网站
>
> 要求：
>
> 1. 要接入完整的注册、登录（一方和三方谷歌登录）
> 2. 有完整的跨模态计费系统，要支持真实调用非 Mock
> 3. 支持 Stripe 支付
> 4. 各主要页面完整复刻，并且学习其 SEO 逻辑
> 5. 保留过程记录

这是当前全部原始需求。

## Task 1 Feedback

整体评价：`B+`。

肯定项：

- 有 PRD、design、architecture 等文档和部分测试用例。
- 主流程页面部分与后端打通，部分流程较完整。

扣分项：

- 企查查 API 没有真实接通，全部使用 Mock。
- Demo 偏简单，呈现出人工打磨不足、像少量提示后由 Codex/GPT 生成的感觉。
- 工程规范简单，没有充分体现成熟工程最佳实践。
- 使用 JavaScript 而非 TypeScript，底层工程偏手搓，缺少成熟框架/工程方案的明显证据。

## Lessons Learned

第一题仓库实际有值得继承的基础：原生小程序与 Express REST 前后端分离；Route/Service/Domain/Repository 分层；Provider 抽象；独立规则引擎；动态表单真实影响报告；统一错误和幂等；协议/登录边界；91 项当前可复现自动测试；PRD、design、architecture、decisions、test-cases 和 Git 阶段历史。

但第二题不能延续以下局限：

1. 只有 Provider 接口、没有真实 Provider 实现；Demo Auth 也不等同生产身份集成。
2. 全 JavaScript/CommonJS，缺少 TypeScript、lint、format、coverage 和 CI 配置。
3. 前端验证以纯函数、静态扫描和人工主流程为主，视觉回归、响应式/真机/弱网专项不完整。
4. UI 以简洁卡片模板为主，缺少系统化页面对照和 Polish 证据。
5. 删除与 README 重复的 `交付说明.md` 后，架构文档和交付脚本仍残留引用，说明最终删除/改名需要全链路清理和复验。

第二题不应只是功能更多，而应证明：真实第三方集成、更成熟的工程规范、更好的 AI 辅助开发方法、更完整的测试、更好的 UI/UX 打磨和更清晰的过程记录。

## Hard Requirements

- 复刻 Creen.ai 网站。
- 完整注册。
- 完整一方登录。
- Google 第三方登录。
- 完整跨模态计费。
- AI 能力真实调用，非 Mock。
- Stripe 支付。
- 各主要页面完整复刻。
- 学习并实现 Creen.ai 的 SEO 逻辑。
- 保留过程记录。

任何实现必须能区分真实外部调用与测试 stub。演示主路径不能使用 Mock 冒充 Google、AI 或 Stripe。

## Unknowns

以下均未被原题确定：

- “主要页面”的具体清单及复刻精度。
- Creen.ai 当前导航、创作流程、登录表现、模态、Pricing、credits 和 SEO 实现。
- 一方注册/登录的具体标识与方式。
- 是否需要邮箱验证、忘记密码、账号合并。
- 支持哪些模态、多少模型、使用哪个 AI Provider。
- 计费单位、价格、免费额度、余额/后付费、订阅或 Credit Pack。
- Stripe 使用何种产品形态、币种、测试或生产验收环境，以及最终状态同步方式。
- 是否需要对象存储、异步任务、管理后台、CMS 或分析平台。
- 数据库、框架、Auth 库、部署平台和域名。
- 可用第三方账号、API Key、Stripe 账号、预算、地区和上线期限。
- 品牌资产和文案的可复用权限。

这些必须写为 `Unknown`、`TBD`、`Requires research` 或 `Candidate option`，不得自行补成甲方要求。

## Research Required

在 PRD 和 Architecture 定稿前，必须访问真实的 Creen.ai 并带证据调研：

- 产品定位、核心用户与主流程。
- 所有可发现页面、页面层级、Header/Footer、导航、CTA 和响应式表现。
- 注册、一方登录、Google 登录和登录后边界。
- 创作流程、输入/输出、任务状态和失败/重试。
- 当前跨模态能力、模型展示和参数。
- Pricing、credits/计费表现、支付触发点和可见 Stripe 流程。
- URL、metadata、canonical、robots、sitemap、标题结构、结构化数据、内链、FAQ 和内容页面。
- 适合上述范围的技术底座、Auth、AI Provider、Stripe、数据和部署候选。

所有研究结论标明日期、URL、访问状态和 `Observed/Inferred/Unknown`。不能凭模型记忆描述 Creen.ai，也不能猜测付费墙后不可见内容。

## Engineering Expectations

- 工作顺序必须是：Research → Requirements → Scope → Architecture → Plan → Implementation → Verification → Review → Polish。
- 在范围和架构明确前，不要直接生成整个网站，也不要先安装一堆依赖。
- 技术栈最终方案 `TBD after research`。TypeScript 与成熟工程底座应作为优先候选；如果不用，需要有明确决策依据。
- 建立可重复的 format、lint、typecheck、test、build 与适当 CI 门禁。
- Auth、AI Provider、跨模态任务、计量/账本、Stripe 和 SEO 都要有清楚边界、失败状态、幂等/一致性设计和验证证据。
- 自动测试可使用 stub/fixture，但必须另有真实集成测试；两者不得混淆。
- 保持 PRD、design、architecture、decisions、test-cases、development-log、README 与代码一致。
- 每个重要阶段记录完成项、修改文件、实际命令、PASS/FAIL/NOT EXECUTED、当前问题和下一步。
- 采用最小但完整的架构；成熟不等于过度设计。

## What NOT to Assume

不要默认：

- 必须做订阅、Credit Pack、免费额度或某种套餐。
- 必须做忘记密码、邮箱验证、手机号登录或复杂账号合并。
- 必须做管理后台、CRM、RBAC、团队空间、CMS 或数据仓库。
- 必须做对象存储、消息队列、某一种数据库或某一种部署平台。
- 必须使用 OpenAI、Google、Replicate、Kling、Runway、Fal 或任何指定 AI Provider。
- 必须支持某个固定模型数量。
- 必须使用某个 Web 框架、Auth 框架或 Stripe UI 方案。
- 必须用 Webhook；它可以是候选，但最终支付状态必须可信。
- Creen.ai 的现状与模型训练记忆相同。
- “复刻”授权复制全部商标、图片和文案。

任何新增能力先说明它属于 P1 必要推导还是 P2 可选项、关联哪个 P0、为什么需要，并等待范围确认后再实现。

