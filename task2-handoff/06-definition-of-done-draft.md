# 第二道能力验证题｜Definition of Done 初版

> 状态：Draft。只能依据当前五条原始要求建立；所有具体页面、模态、Provider、模型、套餐、数据库、框架和部署方案均待调研。  
> 任何 `TBD after research` 在影响 P0 验收时，必须在进入对应实现前被解析并记录。

## 1. 需求与调研完成

- [ ] 已在真实网站上调研 Creen.ai，并记录调研日期、URL、登录状态和可核验证据。
- [ ] 已形成当前“主要页面”、导航、核心用户流程、响应式表现和 SEO 结构清单。
- [ ] 已将需求分为 Original/P0、Derived/P1、Optional/P2 和 TBD，不把推测写成题目要求。
- [ ] 已确认复刻范围及验收精度。`Major pages and fidelity: TBD after research.`
- [ ] 已确认需要实现的跨模态范围。`Modalities and model count: TBD after research.`
- [ ] 已确认真实 AI API 候选与最终选择。`AI Provider: TBD after API capability/cost/integration research.`
- [ ] 已确认第一方注册/登录的具体方式。`First-party auth method: TBD after research/confirmation.`
- [ ] 已确认 Stripe 的商品/支付形态和验收环境。`Stripe mode and test-vs-live acceptance: TBD after research/confirmation.`

## 2. 注册与登录

- [ ] 用户可以完成真实、可持久化的注册流程，而不是只在前端改变状态。
- [ ] 用户可以使用已确认的一方方式登录，并在刷新/重新访问后保持符合设计的会话。
- [ ] 用户可以通过真实 Google 身份流程登录；不是模拟按钮、固定账号或伪造 callback。
- [ ] 受保护页面/API、退出、会话失效和错误状态行为一致。
- [ ] 凭证和第三方 Secret 只保存在服务端安全环境；仓库、日志和客户端 bundle 无明文秘密。
- [ ] 注册、登录、Google 取消/失败、重复身份或账号冲突等已确认边界有测试记录；具体账号合并规则为 `TBD after auth research`。

## 3. 真实跨模态能力与计费

- [ ] 对调研后纳入范围的每种模态，至少一条核心创作链路真实调用选定 AI API 并得到真实结果。
- [ ] 演示主路径不使用 Mock、硬编码结果或本地假延时冒充模型调用。
- [ ] 测试可以使用 stub/fixture 隔离外部不稳定性，但必须另有真实集成验证并明确区分。
- [ ] 每次真实调用产生可追溯的用量/计费事件，能够关联用户、任务、模态、计量单位、价格版本、状态和时间。
- [ ] 用户在提交前或产品设计规定的位置能看到可理解的费用/credits 表现；具体单位为 `TBD after research`。
- [ ] 重复提交、并发、超时、取消、Provider 失败和结果失败不会造成不可解释的重复扣费或账目漂移。
- [ ] 用户可核对与本账户有关的当前计费结果；余额、账单或用量页面的具体形态为 `TBD after research`。
- [ ] AI Provider 错误、限流和超时使用安全文案，不暴露密钥、原始内部错误或其他用户数据。

## 4. Stripe 支付

- [ ] 使用 Stripe 官方真实能力完成端到端支付链路；静态 Pricing 页面或伪造成功页不算完成。
- [ ] 客户端展示状态由可验证的服务端支付记录驱动，不只相信浏览器回跳参数。
- [ ] 创建支付、成功、取消、失败、重复通知/重复提交和延迟状态已验证。
- [ ] Stripe 对象与本地用户、支付/额度记录可追溯，并具有幂等边界。
- [ ] Webhook 是否为最终同步实现：`TBD after Stripe architecture research`；无论采用何种方式，都必须证明最终支付状态可信。
- [ ] Stripe 测试模式是否满足能力验证，或必须 live mode：`TBD after stakeholder confirmation`。未经明确授权不得制造真实收费。
- [ ] 价格、币种、税务、退款、订阅或 Credit Pack 均不在当前默认范围；若调研或确认纳入，必须更新 PRD、架构和测试。

## 5. 主要页面复刻与 UI/UX

- [ ] 调研确认的主要页面全部存在且核心信息、层级、导航和 CTA 可用；页面清单作为本 DoD 附件冻结。
- [ ] 核心流程不是静态拼页，注册、登录、创作、计费和支付均有真实状态变化。
- [ ] 关键页面覆盖 Loading、Empty、Error、Success，以及按实际流程需要的受限、取消和重试状态。
- [ ] 已在约定桌面/移动断点完成页面对照和交互验收。`Viewport matrix: TBD after research.`
- [ ] 视觉、间距、排版、组件状态和反馈经过人工 Polish，不留下 TODO、Lorem ipsum、不可点击主按钮或明显模板残留。
- [ ] 可访问性最低目标与测试方式为 `TBD after architecture/design review`，但表单标签、键盘操作、焦点和颜色信息不得被忽略。

## 6. SEO

- [ ] 已记录 Creen.ai 可观察的 URL、metadata、canonical、robots、sitemap、标题结构、结构化数据、内链和响应式/性能逻辑。
- [ ] 已将确认要学习的 SEO 逻辑映射到本项目具体页面和实现，未照搬无法证明的内部策略。
- [ ] 主要公开页面具有独立、正确且可抓取的 title/description 等 metadata；具体字段以调研结论为准。
- [ ] robots、sitemap、canonical、结构化数据和分享 metadata 按已确认范围实现并通过检查；不适用项写明原因。
- [ ] URL、内部链接、404、重定向和索引边界可验证。
- [ ] SEO 验证工具和性能目标为 `TBD after architecture review`，结果记录为 PASS/FAIL/NOT EXECUTED。

## 7. 工程质量与测试

- [ ] 最终技术栈有基于调研的决策记录，不因第一题反馈而盲目堆技术。`Framework/database/deployment: TBD after research.`
- [ ] 优先采用 TypeScript 和成熟工程底座；若最终不用，`decisions.md` 必须记录充分原因。
- [ ] 存在可重复的 install、dev、build、format、lint、typecheck、test 命令，以及适当的 CI 门禁。
- [ ] 核心业务逻辑与 UI/Route 分离；Auth、AI、计费和 Stripe 第三方边界可替换、可测试。
- [ ] 测试至少分层覆盖领域计费、API/数据、Auth、真实 AI 集成、Stripe 集成、关键 E2E、SEO 和人工视觉 QA。
- [ ] 所有 P0/P1 都能追溯到实现和至少一种验证证据。
- [ ] 没有把 `NOT EXECUTED` 写成 PASS；最终交付列出仍未执行及其风险。
- [ ] 文档、打包/部署脚本和最终仓库一致，删除或改名后已清理全部引用并重新验证。

## 8. 文档与过程记录

- [ ] README 可让首次接触项目的评审独立配置必要测试凭证、启动、演示和测试。
- [ ] research、PRD、design、architecture、decisions、test-cases、development-log 保持最新且职责不重复。
- [ ] 关键阶段按 Research → Requirements → Scope → Architecture → Plan → Implementation → Verification → Review → Polish 留下可追溯记录。
- [ ] `.env.example` 完整但无真实值；仓库敏感信息扫描通过。
- [ ] 已知限制、第三方成本/限流、测试账号要求和生产化缺口写明。

## 9. 最终验收结论

只有在以下条件同时满足时才可声明完成：

- 所有已确认 P0 有可操作实现和证据。
- 注册、一方登录、Google 登录、跨模态真实调用、计费、Stripe、主要页面和 SEO 主流程均实际验证。
- 没有以 Mock 替代演示主路径中的真实第三方能力。
- 没有未解析且会改变 P0 验收含义的关键 TBD。
- 自动测试、真实集成测试、人工视觉/响应式检查和过程记录均如实收口。

